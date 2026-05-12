using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using SmartCare.API.Extensions;
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
        var requesterId = User.GetUserId();
        var requesterRole = User.GetRole();

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

        var requesterId = User.GetUserId();
        var requesterRole = User.GetRole();

        var result = await appointmentService.CancelAppointmentAsync(dto, requesterId, requesterRole);
        return Ok(ApiResponse<AppointmentResponseDto>.Ok(result, "Appointment cancelled successfully."));
    }

    [Authorize(Roles = "Patient,Doctor,Receptionist,Admin")]
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<AppointmentResponseDto>>> GetById(Guid id)
    {
        var requesterId = User.GetUserId();
        var requesterRole = User.GetRole();

        var result = await appointmentService.GetByIdAsync(id, requesterId, requesterRole);
        return Ok(ApiResponse<AppointmentResponseDto>.Ok(result));
    }

    [Authorize(Roles = "Doctor,Receptionist,Admin")]
    [HttpGet("patient/{patientId}")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AppointmentResponseDto>>>> GetPatientAppointments(
        Guid patientId)
    {
        var requesterId = User.GetUserId();
        var requesterRole = User.GetRole();

        var result = await appointmentService.GetPatientAppointmentsAsync(patientId, requesterId, requesterRole);
        return Ok(ApiResponse<IReadOnlyList<AppointmentResponseDto>>.Ok(result));
    }

    [Authorize(Roles = "Doctor,Receptionist,Admin")]
    [HttpGet("doctor/{doctorId}/schedule")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AppointmentResponseDto>>>> GetDoctorSchedule(
        Guid doctorId, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var requesterId = User.GetUserId();
        var requesterRole = User.GetRole();

        var result = await appointmentService.GetDoctorScheduleAsync(doctorId, from, to, requesterId, requesterRole);
        return Ok(ApiResponse<IReadOnlyList<AppointmentResponseDto>>.Ok(result));
    }

    [Authorize(Roles = "Doctor,Receptionist,Admin")]
    [HttpPut("{id}/status")]
    public async Task<ActionResult<ApiResponse<AppointmentResponseDto>>> UpdateStatus(
        Guid id, UpdateStatusDto dto)
    {
        dto.AppointmentId = id;

        var requesterId = User.GetUserId();
        var requesterRole = User.GetRole();

        var result = await appointmentService.UpdateAppointmentStatusAsync(dto, requesterId, requesterRole);
        return Ok(ApiResponse<AppointmentResponseDto>.Ok(result, "Appointment status updated."));
    }

    [Authorize(Policy = "RequirePatientRole")]
    [HttpGet("my")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AppointmentResponseDto>>>> GetMyAppointments()
    {
        var requesterId = User.GetUserId();
        var requesterRole = User.GetRole();

        var result = await appointmentService.GetPatientAppointmentsAsync(requesterId, requesterId, requesterRole);
        return Ok(ApiResponse<IReadOnlyList<AppointmentResponseDto>>.Ok(result));
    }
}
