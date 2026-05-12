using Microsoft.EntityFrameworkCore;
using SmartCare.Application.DTOs.MedicalRecords;
using SmartCare.Application.Exceptions;
using SmartCare.Application.Interfaces;
using SmartCare.Domain.Entities;
using SmartCare.Domain.Enums;
using SmartCare.Infrastructure.Data;

namespace SmartCare.Infrastructure.Services;

public class MedicalRecordService(AppDbContext context) : IMedicalRecordService
{
    public async Task<MedicalRecordDto> GetPatientRecordsAsync(
        Guid patientId, Guid requesterId, string requesterRole)
    {
        if (requesterRole is not ("Doctor" or "Patient"))
            throw new ForbiddenException("You are not authorized to view this patient's records.");

        if (requesterRole == "Patient" && patientId != requesterId)
            throw new ForbiddenException("You are not authorized to view this patient's records.");

        var record = await context.MedicalRecords
            .Include(r => r.Patient)
            .FirstOrDefaultAsync(r => r.PatientId == patientId)
            ?? throw new BadRequestException("No medical record found for this patient.");

        return ToDto(record, record.Patient.FullName);
    }

    public async Task<MedicalRecordDto> CreateRecordAsync(
        CreateMedicalRecordDto dto, Guid requesterId, string requesterRole)
    {
        if (requesterRole != "Doctor")
            throw new ForbiddenException("Only doctors can create medical records.");

        if (dto.PatientId == Guid.Empty)
            throw new BadRequestException("PatientId is required.");

        var patient = await context.Patients.FindAsync(dto.PatientId)
            ?? throw new BadRequestException("Patient not found.");

        if (patient.AccountStatus == AccountStatus.Blocked)
            throw new BadRequestException("Patient account is blocked.");

        var alreadyExists = await context.MedicalRecords
            .AnyAsync(r => r.PatientId == dto.PatientId);

        if (alreadyExists)
            throw new ConflictException("A medical record already exists for this patient.");

        var record = new MedicalRecord
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            Diagnosis = dto.Diagnosis,
            TreatmentPlan = dto.TreatmentPlan,
            LastUpdated = DateTime.UtcNow
        };

        await context.MedicalRecords.AddAsync(record);

        context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = dto.PatientId,
            Message = "Your medical record has been created.",
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        });

        await context.SaveChangesAsync();

        return ToDto(record, patient.FullName);
    }

    public async Task<MedicalRecordDto> UpdateRecordAsync(
        Guid recordId, CreateMedicalRecordDto dto, Guid requesterId, string requesterRole)
    {
        if (requesterRole != "Doctor")
            throw new ForbiddenException("Only doctors can update medical records.");

        var record = await context.MedicalRecords
            .Include(r => r.Patient)
            .FirstOrDefaultAsync(r => r.Id == recordId)
            ?? throw new BadRequestException("Medical record not found.");

        record.Diagnosis = dto.Diagnosis;
        record.TreatmentPlan = dto.TreatmentPlan;
        record.LastUpdated = DateTime.UtcNow;

        context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = record.PatientId,
            Message = "Your medical record has been updated.",
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        });

        await context.SaveChangesAsync();

        return ToDto(record, record.Patient.FullName);
    }

    public async Task<PrescriptionDto> AddPrescriptionAsync(
        CreatePrescriptionDto dto, Guid requesterId, string requesterRole)
    {
        if (requesterRole != "Doctor")
            throw new ForbiddenException("Only doctors can issue prescriptions.");

        if (dto.MedicalRecordId == Guid.Empty)
            throw new BadRequestException("MedicalRecordId is required.");

        var record = await context.MedicalRecords
            .FirstOrDefaultAsync(r => r.Id == dto.MedicalRecordId)
            ?? throw new BadRequestException("Medical record not found.");

        var prescription = new Prescription
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = dto.MedicalRecordId,
            MedicationName = dto.MedicationName,
            Dosage = dto.Dosage,
            Instructions = dto.Instructions,
            IssueDate = dto.IssueDate
        };

        await context.Prescriptions.AddAsync(prescription);

        context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = record.PatientId,
            Message = $"A new prescription for {dto.MedicationName} has been issued.",
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        });

        await context.SaveChangesAsync();

        return ToPrescriptionDto(prescription);
    }

    // recordId is passed as the first argument by the controller (interface names it patientId)
    public async Task<IReadOnlyList<PrescriptionDto>> GetPrescriptionsAsync(
        Guid recordId, Guid requesterId, string requesterRole)
    {
        if (requesterRole is not ("Doctor" or "Patient"))
            throw new ForbiddenException("You are not authorized to view these prescriptions.");

        // Fetch only PatientId first so the ownership check runs before any clinical data is loaded.
        var ownerPatientId = await context.MedicalRecords
            .Where(r => r.Id == recordId)
            .Select(r => (Guid?)r.PatientId)
            .FirstOrDefaultAsync();

        if (ownerPatientId is null)
            throw new BadRequestException("Medical record not found.");

        if (requesterRole == "Patient" && ownerPatientId != requesterId)
            throw new ForbiddenException("You are not authorized to view these prescriptions.");

        var prescriptions = await context.Prescriptions
            .Where(p => p.MedicalRecordId == recordId)
            .ToListAsync();

        return prescriptions.Select(ToPrescriptionDto).ToList();
    }

    public async Task<LabResultDto> AddLabResultAsync(
        CreateLabResultDto dto, Guid requesterId, string requesterRole)
    {
        if (requesterRole != "Doctor")
            throw new ForbiddenException("Only doctors can record lab results.");

        if (dto.PatientId == Guid.Empty)
            throw new BadRequestException("PatientId is required.");

        var patient = await context.Patients.FindAsync(dto.PatientId)
            ?? throw new BadRequestException("Patient not found.");

        if (patient.AccountStatus == AccountStatus.Blocked)
            throw new BadRequestException("Patient account is blocked.");

        var labResult = new LaboratoryResult
        {
            Id = Guid.NewGuid(),
            PatientId = dto.PatientId,
            TestName = dto.TestName,
            ResultValue = dto.ResultValue,
            ResultDate = dto.ResultDate
        };

        await context.LaboratoryResults.AddAsync(labResult);

        context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = dto.PatientId,
            Message = $"A new lab result for {dto.TestName} is available.",
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        });

        await context.SaveChangesAsync();

        return ToLabResultDto(labResult, patient.FullName);
    }

    public async Task<IReadOnlyList<LabResultDto>> GetLabResultsAsync(
        Guid patientId, Guid requesterId, string requesterRole)
    {
        if (requesterRole is not ("Doctor" or "Patient"))
            throw new ForbiddenException("You are not authorized to view these lab results.");

        if (requesterRole == "Patient" && patientId != requesterId)
            throw new ForbiddenException("You are not authorized to view these lab results.");

        _ = await context.Patients.FindAsync(patientId)
            ?? throw new BadRequestException("Patient not found.");

        var results = await context.LaboratoryResults
            .Include(l => l.Patient)
            .Where(l => l.PatientId == patientId)
            .OrderByDescending(l => l.ResultDate)
            .ToListAsync();

        return results.Select(l => ToLabResultDto(l, l.Patient.FullName)).ToList();
    }

    private static MedicalRecordDto ToDto(MedicalRecord r, string patientName) => new()
    {
        Id = r.Id,
        PatientId = r.PatientId,
        PatientName = patientName,
        Diagnosis = r.Diagnosis,
        TreatmentPlan = r.TreatmentPlan,
        LastUpdated = r.LastUpdated
    };

    private static PrescriptionDto ToPrescriptionDto(Prescription p) => new()
    {
        Id = p.Id,
        MedicalRecordId = p.MedicalRecordId,
        MedicationName = p.MedicationName,
        Dosage = p.Dosage,
        Instructions = p.Instructions,
        IssueDate = p.IssueDate
    };

    private static LabResultDto ToLabResultDto(LaboratoryResult l, string patientName) => new()
    {
        Id = l.Id,
        PatientId = l.PatientId,
        PatientName = patientName,
        TestName = l.TestName,
        ResultValue = l.ResultValue,
        ResultDate = l.ResultDate
    };
}
