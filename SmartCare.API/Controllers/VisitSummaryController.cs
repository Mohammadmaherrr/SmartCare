using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartCare.API.Extensions;
using SmartCare.Application.Common;
using SmartCare.Application.DTOs.VisitSummaries;
using SmartCare.Application.Interfaces;

namespace SmartCare.API.Controllers;

[Route("api/appointments/{appointmentId}/summary")]
public class VisitSummaryController(IVisitSummaryService visitSummaryService) : BaseApiController
{
    [Authorize(Roles = "Patient")]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<VisitSummaryDto>>> Submit(
        Guid appointmentId, VisitSummaryDto dto)
    {
        var patientId = User.GetUserId();

        var result = await visitSummaryService.SubmitSummaryAsync(appointmentId, dto, patientId);
        return Ok(ApiResponse<VisitSummaryDto>.Ok(result, "Visit summary submitted successfully."));
    }

    [Authorize(Roles = "Patient,Doctor")]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<VisitSummaryDto>>> Get(Guid appointmentId)
    {
        var requestingUserId = User.GetUserId();
        var role = User.GetRole();

        var result = await visitSummaryService.GetSummaryAsync(appointmentId, requestingUserId, role);
        return Ok(ApiResponse<VisitSummaryDto>.Ok(result));
    }
}
