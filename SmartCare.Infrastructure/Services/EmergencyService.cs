using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SmartCare.Application.DTOs.Emergencies;
using SmartCare.Application.Exceptions;
using SmartCare.Application.Interfaces;
using SmartCare.Domain.Entities;
using SmartCare.Domain.Enums;
using SmartCare.Domain.Helpers;
using SmartCare.Infrastructure.Data;

namespace SmartCare.Infrastructure.Services;

public class EmergencyService(AppDbContext context, ILogger<EmergencyService> logger) : IEmergencyService
{
    private const int MaxNearbyClinics = 3;

    public async Task<IReadOnlyList<NearbyClinicDto>> GetNearbyClinicsAsync(
        double latitude, double longitude, Guid patientId)
    {
        if (latitude is < -90 or > 90)
            throw new BadRequestException("Latitude must be between -90 and 90.");

        if (longitude is < -180 or > 180)
            throw new BadRequestException("Longitude must be between -180 and 180.");

        logger.LogInformation(
            "Nearby-clinics lookup. PatientId={PatientId} Lat={Latitude} Lon={Longitude} At={At}",
            patientId, latitude, longitude, DateTime.UtcNow);

        var clinics = await context.Clinics.ToListAsync();

        return clinics
            .Select(c => new NearbyClinicDto
            {
                Id = c.Id,
                Name = c.Name,
                Address = c.Address,
                PhoneNumber = c.PhoneNumber,
                WorkingHours = c.WorkingHours,
                DistanceKm = Math.Round(
                    GeoHelper.HaversineKm(latitude, longitude, c.Latitude, c.Longitude), 2)
            })
            .OrderBy(c => c.DistanceKm)
            .ToList();
    }

    public async Task<EmergencyResponseDto> CreateEmergencyAsync(CreateEmergencyDto dto, Guid patientId)
    {
        var patient = await context.Patients.FindAsync(patientId)
            ?? throw new BadRequestException("Patient not found.");

        if (patient.AccountStatus == AccountStatus.Blocked)
            throw new BadRequestException("Patient account is blocked.");

        var hasPending = await context.EmergencyRequests
            .AnyAsync(e => e.PatientId == patientId && e.Status == EmergencyStatus.Pending);

        if (hasPending)
            throw new ConflictException("You already have a pending emergency request.");

        var request = new EmergencyRequest
        {
            Id = Guid.NewGuid(),
            PatientId = patientId,
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            RequestTime = DateTime.UtcNow,
            Status = EmergencyStatus.Pending
        };

        await context.EmergencyRequests.AddAsync(request);

        context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = patientId,
            Message = "Your emergency request has been received and is being processed.",
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        });

        await context.SaveChangesAsync();

        // Logged after commit so the audit row is guaranteed persisted first.
        logger.LogInformation(
            "Emergency request created. RequestId={RequestId} PatientId={PatientId} Lat={Latitude} Lon={Longitude} At={RequestTime}",
            request.Id, patientId, dto.Latitude, dto.Longitude, request.RequestTime);

        var clinics = await context.Clinics.ToListAsync();

        var nearbyClinics = clinics
            .Select(c => new NearbyClinicDto
            {
                Id = c.Id,
                Name = c.Name,
                Address = c.Address,
                PhoneNumber = c.PhoneNumber,
                WorkingHours = c.WorkingHours,
                DistanceKm = Math.Round(
                    GeoHelper.HaversineKm(dto.Latitude, dto.Longitude, c.Latitude, c.Longitude), 2)
            })
            .OrderBy(c => c.DistanceKm)
            .Take(MaxNearbyClinics)
            .ToList();

        return new EmergencyResponseDto
        {
            Id = request.Id,
            PatientId = patientId,
            PatientName = patient.FullName,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            RequestTime = request.RequestTime,
            Status = request.Status,
            NearbyClinics = nearbyClinics
        };
    }

    public async Task<EmergencyResponseDto> UpdateStatusAsync(
        Guid requestId, UpdateEmergencyStatusDto dto, Guid requesterId, string role)
    {
        if (requestId == Guid.Empty)
            throw new BadRequestException("Invalid emergency request id.");

        var request = await context.EmergencyRequests
            .Include(e => e.Patient)
            .FirstOrDefaultAsync(e => e.Id == requestId)
            ?? throw new BadRequestException("Emergency request not found.");

        var valid = (request.Status, dto.NewStatus) switch
        {
            (EmergencyStatus.Pending, EmergencyStatus.Dispatched) => true,
            (EmergencyStatus.Dispatched, EmergencyStatus.Resolved) => true,
            _ => false
        };

        if (!valid)
            throw new BadRequestException(
                $"Invalid status transition. Allowed: Pending→Dispatched, Dispatched→Resolved. Current status: {request.Status}.");

        var oldStatus = request.Status;
        request.Status = dto.NewStatus;

        context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = request.PatientId,
            Message = $"Your emergency request status has been updated to {dto.NewStatus}.",
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        });

        try
        {
            await context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException(
                "Emergency request status was modified concurrently. Refresh and retry.");
        }

        logger.LogInformation(
            "Emergency status updated. RequestId={RequestId} {OldStatus}→{NewStatus} UpdatedBy={RequesterId} Role={Role} At={At}",
            request.Id, oldStatus, dto.NewStatus, requesterId, role, DateTime.UtcNow);

        return new EmergencyResponseDto
        {
            Id = request.Id,
            PatientId = request.PatientId,
            PatientName = request.Patient.FullName,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            RequestTime = request.RequestTime,
            Status = request.Status,
            NearbyClinics = []
        };
    }

    public async Task<IReadOnlyList<ActiveEmergencyDto>> GetActiveEmergenciesAsync()
    {
        return await context.EmergencyRequests
            .Where(e => e.Status == EmergencyStatus.Pending || e.Status == EmergencyStatus.Dispatched)
            .Include(e => e.Patient)
            .OrderBy(e => e.RequestTime)
            .Select(e => new ActiveEmergencyDto
            {
                RequestId = e.Id,
                PatientName = e.Patient.FullName,
                Latitude = e.Latitude,
                Longitude = e.Longitude,
                RequestTime = e.RequestTime,
                Status = e.Status
            })
            .ToListAsync();
    }
}
