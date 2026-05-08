namespace SmartCare.Application.DTOs.Auth;

public class RegisterDto
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;

    // Doctor-specific
    public string? Specialization { get; set; }
    public string? LicenseNumber { get; set; }

    // Patient-specific
    public DateOnly? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? ContactNumber { get; set; }
    public string? Address { get; set; }

    // Receptionist-specific
    public string? EmployeeId { get; set; }

    // Admin-specific
    public int? AdminLevel { get; set; }
}
