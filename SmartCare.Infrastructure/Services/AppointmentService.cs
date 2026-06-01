using Microsoft.EntityFrameworkCore;
using SmartCare.Application.DTOs.Appointments;
using SmartCare.Application.Exceptions;
using SmartCare.Application.Interfaces;
using SmartCare.Domain.Constants;
using SmartCare.Domain.Entities;
using SmartCare.Domain.Enums;
using SmartCare.Infrastructure.Data;

namespace SmartCare.Infrastructure.Services;

public class AppointmentService(AppDbContext context) : IAppointmentService
{
    public async Task<AppointmentResponseDto> BookAppointmentAsync(
        BookAppointmentDto dto, Guid requesterId, string requesterRole)
    {
        Guid patientId;
        if (requesterRole == "Patient")
        {
            patientId = requesterId;
        }
        else
        {
            if (dto.PatientId is null || dto.PatientId == Guid.Empty)
                throw new BadRequestException("PatientId is required when booking on behalf of a patient.");
            patientId = dto.PatientId.Value;
        }

        var patient = await context.Patients.FindAsync(patientId)
            ?? throw new BadRequestException("Patient not found.");

        if (patient.AccountStatus == AccountStatus.Blocked)
            throw new BadRequestException("Patient account is blocked.");

        var doctor = await context.Doctors.FindAsync(dto.DoctorId)
            ?? throw new BadRequestException("Doctor not found.");

        if (doctor.AccountStatus == AccountStatus.Blocked)
            throw new BadRequestException("Doctor account is blocked.");

        var existingSlots = await context.Appointments
            .Where(a =>
                a.DoctorId == dto.DoctorId &&
                a.AppointmentDate == dto.AppointmentDate &&
                a.Status != AppointmentStatus.Cancelled &&
                a.Status != AppointmentStatus.NoShow)
            .Select(a => new { a.TimeSlot, a.VisitType })
            .ToListAsync();

        var newEnd = dto.TimeSlot.AddMinutes(VisitTypeDurations.GetMinutes(dto.VisitType));

        var hasConflict = existingSlots.Any(e =>
            dto.TimeSlot < e.TimeSlot.AddMinutes(VisitTypeDurations.GetMinutes(e.VisitType)) &&
            newEnd > e.TimeSlot);

        if (hasConflict)
            throw new ConflictException(
                $"Dr. {doctor.FullName} has a conflicting appointment on {dto.AppointmentDate} at {dto.TimeSlot:HH\\:mm}.");

        var patientSlots = await context.Appointments
            .Where(a =>
                a.PatientId == patientId &&
                a.AppointmentDate == dto.AppointmentDate &&
                a.Status != AppointmentStatus.Cancelled &&
                a.Status != AppointmentStatus.NoShow)
            .Select(a => new { a.TimeSlot, a.VisitType })
            .ToListAsync();

        if (patientSlots.Any(e =>
                dto.TimeSlot < e.TimeSlot.AddMinutes(VisitTypeDurations.GetMinutes(e.VisitType)) &&
                newEnd > e.TimeSlot))
            throw new ConflictException("Patient already has an appointment at this time.");

        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            PatientId = patientId,
            DoctorId = dto.DoctorId,
            AppointmentDate = dto.AppointmentDate,
            TimeSlot = dto.TimeSlot,
            VisitType = dto.VisitType,
            Status = AppointmentStatus.Pending,
            PaymentStatus = PaymentStatus.OnHold
        };

        await context.Appointments.AddAsync(appointment);

        context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = patientId,
            Message = $"Your appointment with Dr. {doctor.FullName} on {dto.AppointmentDate} at {dto.TimeSlot:HH\\:mm} has been booked.",
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        });

        await context.SaveChangesAsync();

        return ToDto(appointment, patient.FullName, doctor.FullName);
    }

    public async Task<AppointmentResponseDto> CancelAppointmentAsync(
        CancelAppointmentDto dto, Guid requesterId, string requesterRole)
    {
        if (requesterRole is not ("Patient" or "Receptionist" or "Admin"))
            throw new ForbiddenException("You are not authorized to cancel this appointment.");

        var appointment = await context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .FirstOrDefaultAsync(a => a.Id == dto.AppointmentId)
            ?? throw new BadRequestException("Appointment not found.");

        if (requesterRole == "Patient" && appointment.PatientId != requesterId)
            throw new ForbiddenException("You are not authorized to cancel this appointment.");

        if (appointment.Status == AppointmentStatus.Completed)
            throw new BadRequestException("Completed appointments cannot be cancelled.");

        if (appointment.Status == AppointmentStatus.NoShow)
            throw new BadRequestException("No-show appointments cannot be cancelled.");

        if (appointment.Status == AppointmentStatus.Cancelled)
            throw new BadRequestException("Appointment is already cancelled.");

        appointment.Status = AppointmentStatus.Cancelled;
        appointment.PaymentStatus = PaymentStatus.Refunded;

        var notificationMessage = string.IsNullOrWhiteSpace(dto.Reason)
            ? $"Your appointment with Dr. {appointment.Doctor.FullName} on {appointment.AppointmentDate} at {appointment.TimeSlot:HH\\:mm} has been cancelled."
            : $"Your appointment with Dr. {appointment.Doctor.FullName} on {appointment.AppointmentDate} at {appointment.TimeSlot:HH\\:mm} has been cancelled. Reason: {dto.Reason}";

        context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = appointment.PatientId,
            Message = notificationMessage,
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        });

        await context.SaveChangesAsync();

        return ToDto(appointment, appointment.Patient.FullName, appointment.Doctor.FullName);
    }

    public async Task<IReadOnlyList<AppointmentResponseDto>> GetDoctorScheduleAsync(
        Guid doctorId, DateOnly? from, DateOnly? to, Guid requesterId, string requesterRole)
    {
        if (requesterRole is not ("Doctor" or "Receptionist" or "Admin"))
            throw new ForbiddenException("You are not authorized to view this schedule.");

        if (requesterRole == "Doctor" && doctorId != requesterId)
            throw new ForbiddenException("You can only view your own schedule.");

        if (from is not null && to is not null && from > to)
            throw new BadRequestException("'from' date must be on or before 'to' date.");

        _ = await context.Doctors.FindAsync(doctorId)
            ?? throw new BadRequestException("Doctor not found.");

        var query = context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .Where(a => a.DoctorId == doctorId && a.Status != AppointmentStatus.Cancelled);

        if (from is not null) query = query.Where(a => a.AppointmentDate >= from);
        if (to is not null) query = query.Where(a => a.AppointmentDate <= to);

        var appointments = await query
            .OrderBy(a => a.AppointmentDate)
            .ThenBy(a => a.TimeSlot)
            .ToListAsync();

        return appointments.Select(a => ToDto(a, a.Patient.FullName, a.Doctor.FullName)).ToList();
    }

    public async Task<IReadOnlyList<BusySlotDto>> GetDoctorBusySlotsAsync(Guid doctorId, DateOnly date)
    {
        _ = await context.Doctors.FindAsync(doctorId)
            ?? throw new BadRequestException("Doctor not found.");

        var appointments = await context.Appointments
            .Where(a =>
                a.DoctorId == doctorId &&
                a.AppointmentDate == date &&
                a.Status != AppointmentStatus.Cancelled &&
                a.Status != AppointmentStatus.NoShow)
            .Select(a => new { a.TimeSlot, a.VisitType })
            .ToListAsync();

        return appointments
            .Select(a => new BusySlotDto
            {
                TimeSlot = a.TimeSlot,
                EndTime = a.TimeSlot.AddMinutes(VisitTypeDurations.GetMinutes(a.VisitType)),
            })
            .OrderBy(b => b.TimeSlot)
            .ToList();
    }

    public async Task<IReadOnlyList<AppointmentResponseDto>> GetPatientAppointmentsAsync(
        Guid patientId, Guid requesterId, string requesterRole)
    {
        if (requesterRole is not ("Patient" or "Doctor" or "Receptionist" or "Admin"))
            throw new ForbiddenException("You are not authorized to view these appointments.");

        if (requesterRole == "Patient" && patientId != requesterId)
            throw new ForbiddenException("You can only view your own appointments.");

        var appointments = await context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .Where(a => a.PatientId == patientId)
            .OrderBy(a => a.AppointmentDate)
            .ThenBy(a => a.TimeSlot)
            .ToListAsync();

        return appointments.Select(a => ToDto(a, a.Patient.FullName, a.Doctor.FullName)).ToList();
    }

    public async Task<AppointmentResponseDto> GetByIdAsync(
        Guid appointmentId, Guid requesterId, string requesterRole)
    {
        if (requesterRole is not ("Patient" or "Doctor" or "Receptionist" or "Admin"))
            throw new ForbiddenException("You are not authorized to view this appointment.");

        var appointment = await context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .FirstOrDefaultAsync(a => a.Id == appointmentId)
            ?? throw new BadRequestException("Appointment not found.");

        if (requesterRole == "Patient" && appointment.PatientId != requesterId)
            throw new ForbiddenException("You are not authorized to view this appointment.");

        if (requesterRole == "Doctor" && appointment.DoctorId != requesterId)
            throw new ForbiddenException("You are not authorized to view this appointment.");

        return ToDto(appointment, appointment.Patient.FullName, appointment.Doctor.FullName);
    }

    public async Task<PatientProfileDto> GetPatientForAppointmentAsync(
        Guid appointmentId, Guid requesterId, string requesterRole)
    {
        if (requesterRole is not ("Patient" or "Doctor" or "Receptionist" or "Admin"))
            throw new ForbiddenException("You are not authorized to view this patient.");

        var appointment = await context.Appointments
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == appointmentId)
            ?? throw new BadRequestException("Appointment not found.");

        if (requesterRole == "Patient" && appointment.PatientId != requesterId)
            throw new ForbiddenException("You are not authorized to view this patient.");

        if (requesterRole == "Doctor" && appointment.DoctorId != requesterId)
            throw new ForbiddenException("You are not authorized to view this patient.");

        var patient = appointment.Patient;
        return new PatientProfileDto
        {
            Id = patient.Id,
            FullName = patient.FullName,
            DateOfBirth = patient.DateOfBirth,
            Gender = patient.Gender,
            ContactNumber = patient.ContactNumber,
            Address = patient.Address,
        };
    }

    public async Task<AppointmentResponseDto> UpdateAppointmentStatusAsync(
        UpdateStatusDto dto, Guid requesterId, string requesterRole)
    {
        if (requesterRole is not ("Doctor" or "Receptionist" or "Admin"))
            throw new ForbiddenException("You are not authorized to update appointment status.");

        var appointment = await context.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .FirstOrDefaultAsync(a => a.Id == dto.AppointmentId)
            ?? throw new BadRequestException("Appointment not found.");

        if (requesterRole == "Doctor" && appointment.DoctorId != requesterId)
            throw new ForbiddenException("You can only update appointments assigned to you.");

        ValidateStatusTransition(appointment.Status, dto.NewStatus);

        appointment.Status = dto.NewStatus;
        appointment.PaymentStatus = dto.NewStatus switch
        {
            AppointmentStatus.Completed => PaymentStatus.Charged,
            AppointmentStatus.NoShow    => PaymentStatus.Charged,
            _                           => appointment.PaymentStatus
        };

        var notificationMessage = dto.NewStatus switch
        {
            AppointmentStatus.Confirmed => $"Your appointment with Dr. {appointment.Doctor.FullName} on {appointment.AppointmentDate} at {appointment.TimeSlot:HH\\:mm} has been confirmed.",
            AppointmentStatus.Completed => $"Your appointment with Dr. {appointment.Doctor.FullName} on {appointment.AppointmentDate} at {appointment.TimeSlot:HH\\:mm} has been completed.",
            AppointmentStatus.NoShow    => $"You were marked as no-show for your appointment with Dr. {appointment.Doctor.FullName} on {appointment.AppointmentDate} at {appointment.TimeSlot:HH\\:mm}.",
            _ => null
        };

        if (notificationMessage is not null)
            context.Notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                UserId = appointment.PatientId,
                Message = notificationMessage,
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            });

        await context.SaveChangesAsync();

        return ToDto(appointment, appointment.Patient.FullName, appointment.Doctor.FullName);
    }

    private static void ValidateStatusTransition(AppointmentStatus current, AppointmentStatus next)
    {
        var allowed = (current, next) switch
        {
            (AppointmentStatus.Pending,   AppointmentStatus.Confirmed) => true,
            (AppointmentStatus.Confirmed, AppointmentStatus.Completed) => true,
            (AppointmentStatus.Confirmed, AppointmentStatus.NoShow)    => true,
            _ => false
        };

        if (!allowed)
            throw new BadRequestException(
                $"Cannot transition appointment from '{current}' to '{next}'.");
    }

    private static AppointmentResponseDto ToDto(
        Appointment a, string patientName, string doctorName) => new()
    {
        Id = a.Id,
        PatientId = a.PatientId,
        PatientName = patientName,
        DoctorId = a.DoctorId,
        DoctorName = doctorName,
        AppointmentDate = a.AppointmentDate,
        TimeSlot = a.TimeSlot,
        EndTime = a.TimeSlot.AddMinutes(VisitTypeDurations.GetMinutes(a.VisitType)),
        VisitType = a.VisitType,
        Status = a.Status,
        PaymentStatus = a.PaymentStatus
    };
}
