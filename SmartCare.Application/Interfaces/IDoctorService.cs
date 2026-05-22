using SmartCare.Application.DTOs.Doctors;

namespace SmartCare.Application.Interfaces;

public interface IDoctorService
{
    Task<IReadOnlyList<DoctorResponseDto>> GetAllAsync();
}
