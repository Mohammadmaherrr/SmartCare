using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartCare.Application.Common;
using SmartCare.Application.DTOs.Admin;
using SmartCare.Application.Interfaces;

namespace SmartCare.API.Controllers;

[Route("api/patients")]
[Authorize(Roles = "Doctor,Receptionist,Admin")]
public class PatientsController(IAdminService adminService) : BaseApiController
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<UserSummaryDto>>>> GetPatients()
    {
        var result = await adminService.GetUsersAsync("Patient");
        return Ok(ApiResponse<IReadOnlyList<UserSummaryDto>>.Ok(result));
    }
}
