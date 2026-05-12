using SmartCare.Domain.Enums;

namespace SmartCare.Application.DTOs.Emergencies;

public class ActiveEmergencyDto
{
    public Guid RequestId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public DateTime RequestTime { get; set; }
    public EmergencyStatus Status { get; set; }
}
