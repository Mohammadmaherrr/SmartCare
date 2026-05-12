namespace SmartCare.Application.DTOs.MedicalRecords;

public class CreatePrescriptionDto
{
    public Guid MedicalRecordId { get; set; }
    public string MedicationName { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string? Instructions { get; set; }
    public DateOnly IssueDate { get; set; }
}
