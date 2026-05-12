namespace SmartCare.Application.DTOs.Admin;

public class UpdateUserDto
{
    public string? FullName { get; set; }
    public string? Email { get; set; }

    // Doctor
    public string? Specialization { get; set; }
    public string? LicenseNumber { get; set; }

    // Receptionist
    public string? EmployeeId { get; set; }

    // Patient
    public DateOnly? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? ContactNumber { get; set; }
    public string? Address { get; set; }
}
