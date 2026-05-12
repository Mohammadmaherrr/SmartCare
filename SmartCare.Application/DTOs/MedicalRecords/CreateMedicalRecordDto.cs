namespace SmartCare.Application.DTOs.MedicalRecords;

public class CreateMedicalRecordDto
{
    public Guid PatientId { get; set; }
    public string Diagnosis { get; set; } = string.Empty;
    public string? TreatmentPlan { get; set; }
}
