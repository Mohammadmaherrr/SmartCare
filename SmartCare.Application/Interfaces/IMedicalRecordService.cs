using SmartCare.Application.DTOs.MedicalRecords;

namespace SmartCare.Application.Interfaces;

public interface IMedicalRecordService
{
    Task<MedicalRecordDto> GetPatientRecordsAsync(Guid patientId, Guid requesterId, string requesterRole);
    Task<MedicalRecordDto> CreateRecordAsync(CreateMedicalRecordDto dto, Guid requesterId, string requesterRole);
    Task<MedicalRecordDto> UpdateRecordAsync(Guid recordId, UpdateMedicalRecordDto dto, Guid requesterId, string requesterRole);

    Task<PrescriptionDto> AddPrescriptionAsync(CreatePrescriptionDto dto, Guid requesterId, string requesterRole);
    Task<IReadOnlyList<PrescriptionDto>> GetPrescriptionsAsync(Guid patientId, Guid requesterId, string requesterRole);

    Task<LabResultDto> AddLabResultAsync(CreateLabResultDto dto, Guid requesterId, string requesterRole);
    Task<IReadOnlyList<LabResultDto>> GetLabResultsAsync(Guid patientId, Guid requesterId, string requesterRole);
}
