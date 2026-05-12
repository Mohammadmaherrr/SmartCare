using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartCare.API.Extensions;
using SmartCare.Application.Common;
using SmartCare.Application.DTOs.Admin;
using SmartCare.Application.Interfaces;

namespace SmartCare.API.Controllers;

[Route("api/admin")]
[Authorize(Policy = "RequireAdminRole")]
public class AdminController(IAdminService adminService) : BaseApiController
{
    [HttpGet("users")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<UserSummaryDto>>>> GetUsers(
        [FromQuery] string? role)
    {
        var result = await adminService.GetUsersAsync(role);
        return Ok(ApiResponse<IReadOnlyList<UserSummaryDto>>.Ok(result));
    }

    [HttpPost("users")]
    public async Task<ActionResult<ApiResponse<UserSummaryDto>>> CreateStaff(CreateStaffDto dto)
    {
        var result = await adminService.CreateStaffAsync(dto);
        return Ok(ApiResponse<UserSummaryDto>.Ok(result, "Staff account created successfully."));
    }

    [HttpPut("users/{id}")]
    public async Task<ActionResult<ApiResponse<UserSummaryDto>>> UpdateUser(Guid id, UpdateUserDto dto)
    {
        var result = await adminService.UpdateUserAsync(id, dto);
        return Ok(ApiResponse<UserSummaryDto>.Ok(result, "User updated successfully."));
    }

    [HttpDelete("users/{id}")]
    public async Task<ActionResult<ApiResponse<string>>> DeactivateUser(Guid id)
    {
        var requesterId = User.GetUserId();
        await adminService.DeactivateUserAsync(id, requesterId);
        return Ok(ApiResponse<string>.Ok(string.Empty, "User account deactivated."));
    }

    [HttpGet("settings")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<SystemSettingDto>>>> GetSettings()
    {
        var result = await adminService.GetSettingsAsync();
        return Ok(ApiResponse<IReadOnlyList<SystemSettingDto>>.Ok(result));
    }

    [HttpPut("settings")]
    public async Task<ActionResult<ApiResponse<SystemSettingDto>>> UpdateSetting(UpdateSettingDto dto)
    {
        var result = await adminService.UpdateSettingAsync(dto);
        return Ok(ApiResponse<SystemSettingDto>.Ok(result, "Setting updated successfully."));
    }

    [HttpGet("reports/appointments")]
    public async Task<ActionResult<ApiResponse<AppointmentReportDto>>> GetAppointmentReport(
        [FromQuery] DateOnly? startDate, [FromQuery] DateOnly? endDate)
    {
        var result = await adminService.GetAppointmentReportAsync(startDate, endDate);
        return Ok(ApiResponse<AppointmentReportDto>.Ok(result));
    }

    [HttpGet("reports/visits")]
    public async Task<ActionResult<ApiResponse<VisitFrequencyReportDto>>> GetVisitFrequencyReport(
        [FromQuery] DateOnly? startDate, [FromQuery] DateOnly? endDate)
    {
        var result = await adminService.GetVisitFrequencyReportAsync(startDate, endDate);
        return Ok(ApiResponse<VisitFrequencyReportDto>.Ok(result));
    }
}
