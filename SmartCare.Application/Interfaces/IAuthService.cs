using SmartCare.Application.DTOs.Auth;

namespace SmartCare.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterPatientAsync(RegisterDto dto);
    Task<AuthResponseDto> RegisterStaffAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
}
