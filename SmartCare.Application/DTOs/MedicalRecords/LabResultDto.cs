namespace SmartCare.Application.DTOs.MedicalRecords;

public class LabResultDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public string ResultValue { get; set; } = string.Empty;
    public DateOnly ResultDate { get; set; }
}
