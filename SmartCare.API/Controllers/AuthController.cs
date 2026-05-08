using System.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartCare.Application.Common;
using SmartCare.Application.DTOs.Auth;
using SmartCare.Application.Interfaces;
using SmartCare.Infrastructure.Services;

namespace SmartCare.API.Controllers;

[Route("api/auth")]
public class AuthController(IAuthService authService) : BaseApiController
{
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Register(RegisterDto dto)
    {
        dto.Role = "Patient";
        var result = await authService.RegisterPatientAsync(dto);
        return Ok(ApiResponse<AuthResponseDto>.Ok(result, "Registration successful."));
    }

    [Authorize(Policy = "RequireAdminRole")]
    [HttpPost("register/staff")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> RegisterStaff(RegisterDto dto)
    {
        var result = await authService.RegisterStaffAsync(dto);
        return Ok(ApiResponse<AuthResponseDto>.Ok(result, "Staff member registered successfully."));
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Login(LoginDto dto)
    {
        var result = await authService.LoginAsync(dto);
        return Ok(ApiResponse<AuthResponseDto>.Ok(result, "Login successful."));
    }
}
