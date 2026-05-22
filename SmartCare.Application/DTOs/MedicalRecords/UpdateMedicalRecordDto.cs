namespace SmartCare.Application.DTOs.MedicalRecords;

public class UpdateMedicalRecordDto
{
    public string Diagnosis { get; set; } = string.Empty;
    public string? TreatmentPlan { get; set; }
}
