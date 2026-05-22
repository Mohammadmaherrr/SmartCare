using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartCare.API.Extensions;
using SmartCare.Application.Common;
using SmartCare.Application.DTOs.MedicalRecords;
using SmartCare.Application.Interfaces;

namespace SmartCare.API.Controllers;

[Route("api")]
public class MedicalRecordsController(IMedicalRecordService medicalRecordService) : BaseApiController
{
    [Authorize(Roles = "Doctor,Patient")]
    [HttpGet("patients/{patientId}/records")]
    public async Task<ActionResult<ApiResponse<MedicalRecordDto>>> GetPatientRecord(Guid patientId)
    {
        var requesterId = User.GetUserId();
        var requesterRole = User.GetRole();

        var result = await medicalRecordService.GetPatientRecordsAsync(patientId, requesterId, requesterRole);
        return Ok(ApiResponse<MedicalRecordDto>.Ok(result));
    }

    [Authorize(Roles = "Doctor")]
    [HttpPost("patients/{patientId}/records")]
    public async Task<ActionResult<ApiResponse<MedicalRecordDto>>> CreateRecord(
        Guid patientId, CreateMedicalRecordDto dto)
    {
        var requesterId = User.GetUserId();
        var requesterRole = User.GetRole();

        dto.PatientId = patientId;
        var result = await medicalRecordService.CreateRecordAsync(dto, requesterId, requesterRole);
        return Ok(ApiResponse<MedicalRecordDto>.Ok(result, "Medical record created successfully."));
    }

    [Authorize(Roles = "Doctor")]
    [HttpPut("records/{recordId}")]
    public async Task<ActionResult<ApiResponse<MedicalRecordDto>>> UpdateRecord(
        Guid recordId, UpdateMedicalRecordDto dto)
    {
        var requesterId = User.GetUserId();
        var requesterRole = User.GetRole();

        var result = await medicalRecordService.UpdateRecordAsync(recordId, dto, requesterId, requesterRole);
        return Ok(ApiResponse<MedicalRecordDto>.Ok(result, "Medical record updated successfully."));
    }

    [Authorize(Roles = "Doctor,Patient")]
    [HttpGet("records/{recordId}/prescriptions")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<PrescriptionDto>>>> GetPrescriptions(Guid recordId)
    {
        var requesterId = User.GetUserId();
        var requesterRole = User.GetRole();

        var result = await medicalRecordService.GetPrescriptionsAsync(recordId, requesterId, requesterRole);
        return Ok(ApiResponse<IReadOnlyList<PrescriptionDto>>.Ok(result));
    }

    [Authorize(Roles = "Doctor")]
    [HttpPost("records/{recordId}/prescriptions")]
    public async Task<ActionResult<ApiResponse<PrescriptionDto>>> AddPrescription(
        Guid recordId, CreatePrescriptionDto dto)
    {
        var requesterId = User.GetUserId();
        var requesterRole = User.GetRole();

        dto.MedicalRecordId = recordId;
        var result = await medicalRecordService.AddPrescriptionAsync(dto, requesterId, requesterRole);
        return Ok(ApiResponse<PrescriptionDto>.Ok(result, "Prescription added successfully."));
    }

    [Authorize(Roles = "Doctor")]
    [HttpPost("patients/{patientId}/lab-results")]
    public async Task<ActionResult<ApiResponse<LabResultDto>>> AddLabResult(
        Guid patientId, CreateLabResultDto dto)
    {
        var requesterId = User.GetUserId();
        var requesterRole = User.GetRole();

        dto.PatientId = patientId;
        var result = await medicalRecordService.AddLabResultAsync(dto, requesterId, requesterRole);
        return Ok(ApiResponse<LabResultDto>.Ok(result, "Lab result added successfully."));
    }

    [Authorize(Roles = "Doctor,Patient")]
    [HttpGet("patients/{patientId}/lab-results")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<LabResultDto>>>> GetLabResults(Guid patientId)
    {
        var requesterId = User.GetUserId();
        var requesterRole = User.GetRole();

        var result = await medicalRecordService.GetLabResultsAsync(patientId, requesterId, requesterRole);
        return Ok(ApiResponse<IReadOnlyList<LabResultDto>>.Ok(result));
    }
}
