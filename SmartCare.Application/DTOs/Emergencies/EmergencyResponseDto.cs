using SmartCare.Domain.Enums;

namespace SmartCare.Application.DTOs.Emergencies;

public class EmergencyResponseDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public DateTime RequestTime { get; set; }
    public EmergencyStatus Status { get; set; }
    public List<NearbyClinicDto> NearbyClinics { get; set; } = [];
}
