using SmartCare.Application.DTOs.Emergencies;

namespace SmartCare.Application.Interfaces;

public interface IEmergencyService
{
    Task<EmergencyResponseDto> CreateEmergencyAsync(CreateEmergencyDto dto, Guid patientId);
    Task<IReadOnlyList<NearbyClinicDto>> GetNearbyClinicsAsync(double latitude, double longitude, Guid patientId);
    Task<EmergencyResponseDto> UpdateStatusAsync(Guid requestId, UpdateEmergencyStatusDto dto, Guid requesterId, string role);
    Task<IReadOnlyList<ActiveEmergencyDto>> GetActiveEmergenciesAsync();
}
