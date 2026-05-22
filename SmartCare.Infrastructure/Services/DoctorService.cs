using Microsoft.EntityFrameworkCore;
using SmartCare.Application.DTOs.Doctors;
using SmartCare.Application.Interfaces;
using SmartCare.Domain.Enums;
using SmartCare.Infrastructure.Data;

namespace SmartCare.Infrastructure.Services;

public class DoctorService(AppDbContext context) : IDoctorService
{
    public async Task<IReadOnlyList<DoctorResponseDto>> GetAllAsync()
    {
        return await context.Doctors
            .Where(d => d.AccountStatus == AccountStatus.Active)
            .OrderBy(d => d.FullName)
            .Select(d => new DoctorResponseDto
            {
                Id = d.Id,
                FullName = d.FullName,
                Specialization = d.Specialization
            })
            .ToListAsync();
    }
}
