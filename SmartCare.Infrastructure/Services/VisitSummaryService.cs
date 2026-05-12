using Microsoft.EntityFrameworkCore;
using SmartCare.Application.DTOs.VisitSummaries;
using SmartCare.Application.Exceptions;
using SmartCare.Application.Interfaces;
using SmartCare.Domain.Entities;
using SmartCare.Domain.Enums;
using SmartCare.Infrastructure.Data;

namespace SmartCare.Infrastructure.Services;

public class VisitSummaryService(AppDbContext context) : IVisitSummaryService
{
    public async Task<VisitSummaryDto> SubmitSummaryAsync(
        Guid appointmentId, VisitSummaryDto dto, Guid patientId)
    {
        if (appointmentId == Guid.Empty)
            throw new BadRequestException("AppointmentId is required.");

        var appointment = await context.Appointments
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        // Collapse "not found" and "not the owner" into a single 403 so a patient
        // cannot enumerate appointment ids belonging to other patients.
        if (appointment is null || appointment.PatientId != patientId)
            throw new ForbiddenException("You are not authorized to submit a summary for this appointment.");

        if (appointment.Patient.AccountStatus == AccountStatus.Blocked)
            throw new BadRequestException("Your account is blocked.");

        if (appointment.Status == AppointmentStatus.Completed ||
            appointment.Status == AppointmentStatus.Cancelled)
        {
            throw new BadRequestException(
                $"Cannot submit a visit summary for a {appointment.Status} appointment.");
        }

        var alreadyExists = await context.VisitSummaries
            .AnyAsync(v => v.AppointmentId == appointmentId);

        if (alreadyExists)
            throw new ConflictException("A visit summary already exists for this appointment.");

        var summary = new VisitSummary
        {
            Id = Guid.NewGuid(),
            AppointmentId = appointmentId,
            Symptoms = dto.Symptoms,
            Description = dto.Description,
            PainLevel = dto.PainLevel,
            SymptomDuration = dto.SymptomDuration,
            SubmissionDate = DateTime.UtcNow
        };

        await context.VisitSummaries.AddAsync(summary);

        context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = appointment.DoctorId,
            Message = "A patient has submitted a visit summary for an upcoming appointment.",
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        });

        await context.SaveChangesAsync();

        return ToDto(summary);
    }

    public async Task<VisitSummaryDto> GetSummaryAsync(
        Guid appointmentId, Guid requestingUserId, string role)
    {
        if (appointmentId == Guid.Empty)
            throw new BadRequestException("AppointmentId is required.");

        var appointment = await context.Appointments
            .Select(a => new { a.Id, a.PatientId, a.DoctorId })
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        // Collapse "not found" and "not authorized" into a single 403 — per spec,
        // both Patient (non-owner) and Doctor (not-assigned) get 403, and we also
        // don't want to reveal whether the appointment exists at all.
        var authorized = appointment is not null && role switch
        {
            "Patient" => appointment.PatientId == requestingUserId,
            "Doctor" => appointment.DoctorId == requestingUserId,
            _ => false
        };

        if (!authorized)
            throw new ForbiddenException("You are not authorized to view this visit summary.");

        var summary = await context.VisitSummaries
            .FirstOrDefaultAsync(v => v.AppointmentId == appointmentId)
            ?? throw new BadRequestException("No visit summary found for this appointment.");

        return ToDto(summary);
    }

    private static VisitSummaryDto ToDto(VisitSummary v) => new()
    {
        Symptoms = v.Symptoms,
        Description = v.Description,
        PainLevel = v.PainLevel,
        SymptomDuration = v.SymptomDuration
    };
}
