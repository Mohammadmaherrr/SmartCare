namespace SmartCare.Application.DTOs.Admin;

public class CreateStaffDto
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty; // Doctor or Receptionist only

    // Doctor-specific
    public string? Specialization { get; set; }
    public string? LicenseNumber { get; set; }

    // Receptionist-specific
    public string? EmployeeId { get; set; }
}
