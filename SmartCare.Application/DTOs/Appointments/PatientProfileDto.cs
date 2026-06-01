namespace SmartCare.Application.DTOs.Appointments;

public class PatientProfileDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public DateOnly DateOfBirth { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string? ContactNumber { get; set; }
    public string? Address { get; set; }
}
