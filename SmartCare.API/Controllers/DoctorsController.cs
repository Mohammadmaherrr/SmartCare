using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartCare.Application.Common;
using SmartCare.Application.DTOs.Doctors;
using SmartCare.Application.Interfaces;

namespace SmartCare.API.Controllers;

[Route("api/doctors")]
public class DoctorsController(IDoctorService doctorService) : BaseApiController
{
    [Authorize(Roles = "Patient,Doctor,Receptionist,Admin")]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<DoctorResponseDto>>>> GetAll()
    {
        var result = await doctorService.GetAllAsync();
        return Ok(ApiResponse<IReadOnlyList<DoctorResponseDto>>.Ok(result));
    }
}
