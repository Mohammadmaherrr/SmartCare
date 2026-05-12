namespace SmartCare.Application.DTOs.Admin;

public class UserSummaryDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string AccountStatus { get; set; } = string.Empty;

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

    // Admin
    public int? AdminLevel { get; set; }
}
