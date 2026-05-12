namespace SmartCare.Application.DTOs.MedicalRecords;

public class CreateLabResultDto
{
    public Guid PatientId { get; set; }
    public string TestName { get; set; } = string.Empty;
    public string ResultValue { get; set; } = string.Empty;
    public DateOnly ResultDate { get; set; }
}
