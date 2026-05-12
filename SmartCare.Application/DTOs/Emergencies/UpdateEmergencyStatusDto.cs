using SmartCare.Domain.Enums;

namespace SmartCare.Application.DTOs.Emergencies;

public class UpdateEmergencyStatusDto
{
    public EmergencyStatus NewStatus { get; set; }
}
