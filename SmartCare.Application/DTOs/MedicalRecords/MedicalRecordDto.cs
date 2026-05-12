namespace SmartCare.Application.DTOs.MedicalRecords;

public class MedicalRecordDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string Diagnosis { get; set; } = string.Empty;
    public string? TreatmentPlan { get; set; }
    public DateTime LastUpdated { get; set; }
}
