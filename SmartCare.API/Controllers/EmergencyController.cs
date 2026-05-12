using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using SmartCare.API.Extensions;
using SmartCare.Application.Common;
using SmartCare.Application.DTOs.Emergencies;
using SmartCare.Application.Interfaces;

namespace SmartCare.API.Controllers;

[Route("api/emergency")]
public class EmergencyController(IEmergencyService emergencyService) : BaseApiController
{
    [Authorize(Roles = "Patient")]
    [HttpPost("request")]
    public async Task<ActionResult<ApiResponse<EmergencyResponseDto>>> CreateEmergencyRequest(
        CreateEmergencyDto dto)
    {
        var patientId = User.GetUserId();

        var result = await emergencyService.CreateEmergencyAsync(dto, patientId);
        return Ok(ApiResponse<EmergencyResponseDto>.Ok(result, "Emergency request submitted. Help is on the way."));
    }

    [Authorize(Roles = "Patient")]
    [HttpGet("nearby-clinics")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<NearbyClinicDto>>>> GetNearbyClinics(
        [FromQuery, BindRequired] double lat, [FromQuery, BindRequired] double lng)
    {
        var patientId = User.GetUserId();

        var result = await emergencyService.GetNearbyClinicsAsync(lat, lng, patientId);
        return Ok(ApiResponse<IReadOnlyList<NearbyClinicDto>>.Ok(result));
    }

    [Authorize(Roles = "Doctor,Receptionist,Admin")]
    [HttpPut("{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<EmergencyResponseDto>>> UpdateEmergencyStatus(
        Guid id, UpdateEmergencyStatusDto dto)
    {
        var requesterId = User.GetUserId();
        var role = User.GetRole();

        var result = await emergencyService.UpdateStatusAsync(id, dto, requesterId, role);
        return Ok(ApiResponse<EmergencyResponseDto>.Ok(result, $"Emergency status updated to {dto.NewStatus}."));
    }

    [Authorize(Roles = "Doctor,Receptionist,Admin")]
    [HttpGet("active")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ActiveEmergencyDto>>>> GetActiveEmergencies()
    {
        var result = await emergencyService.GetActiveEmergenciesAsync();
        return Ok(ApiResponse<IReadOnlyList<ActiveEmergencyDto>>.Ok(result));
    }
}
