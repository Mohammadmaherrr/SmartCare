using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using SmartCare.Application.Common;
using SmartCare.Application.DTOs.Appointments;
using SmartCare.Application.Interfaces;

namespace SmartCare.API.Controllers;

[Route("api/appointments")]
public class AppointmentsController(IAppointmentService appointmentService) : BaseApiController
{
    [Authorize(Roles = "Patient,Receptionist,Admin")]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<AppointmentResponseDto>>> BookAppointment(
        BookAppointmentDto dto)
    {
        var requesterId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var requesterRole = User.FindFirstValue(ClaimTypes.Role)!;

        var result = await appointmentService.BookAppointmentAsync(dto, requesterId, requesterRole);
        return Ok(ApiResponse<AppointmentResponseDto>.Ok(result, "Appointment booked successfully."));
    }

    [Authorize(Roles = "Patient,Receptionist,Admin")]
    [HttpPut("{id}/cancel")]
    public async Task<ActionResult<ApiResponse<AppointmentResponseDto>>> CancelAppointment(
        Guid id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] CancelAppointmentDto? dto)
    {
        dto ??= new CancelAppointmentDto();
        dto.AppointmentId = id;

        var requesterId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var requesterRole = User.FindFirstValue(ClaimTypes.Role)!;

        var result = await appointmentService.CancelAppointmentAsync(dto, requesterId, requesterRole);
        return Ok(ApiResponse<AppointmentResponseDto>.Ok(result, "Appointment cancelled successfully."));
    }

    [Authorize(Roles = "Doctor,Receptionist,Admin")]
    [HttpGet("doctor/{doctorId}/schedule")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AppointmentResponseDto>>>> GetDoctorSchedule(
        Guid doctorId)
    {
        var requesterId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var requesterRole = User.FindFirstValue(ClaimTypes.Role)!;

        var result = await appointmentService.GetDoctorScheduleAsync(doctorId, requesterId, requesterRole);
        return Ok(ApiResponse<IReadOnlyList<AppointmentResponseDto>>.Ok(result));
    }

    [Authorize(Roles = "Doctor,Receptionist,Admin")]
    [HttpPut("{id}/status")]
    public async Task<ActionResult<ApiResponse<AppointmentResponseDto>>> UpdateStatus(
        Guid id, UpdateStatusDto dto)
    {
        dto.AppointmentId = id;

        var requesterId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var requesterRole = User.FindFirstValue(ClaimTypes.Role)!;

        var result = await appointmentService.UpdateAppointmentStatusAsync(dto, requesterId, requesterRole);
        return Ok(ApiResponse<AppointmentResponseDto>.Ok(result, "Appointment status updated."));
    }

    [Authorize(Policy = "RequirePatientRole")]
    [HttpGet("my")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AppointmentResponseDto>>>> GetMyAppointments()
    {
        var requesterId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var requesterRole = User.FindFirstValue(ClaimTypes.Role)!;

        var result = await appointmentService.GetPatientAppointmentsAsync(requesterId, requesterId, requesterRole);
        return Ok(ApiResponse<IReadOnlyList<AppointmentResponseDto>>.Ok(result));
    }
}
