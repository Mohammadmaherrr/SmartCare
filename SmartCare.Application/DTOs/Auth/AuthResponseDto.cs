namespace SmartCare.Application.DTOs.Auth;

public class AuthResponseDto
{
    public required string Token { get; set; }
    public required string Role { get; set; }
    public required Guid UserId { get; set; }
    public required string FullName { get; set; }
}
