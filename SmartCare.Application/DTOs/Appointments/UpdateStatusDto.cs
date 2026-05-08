using SmartCare.Domain.Enums;

namespace SmartCare.Application.DTOs.Appointments;

public class UpdateStatusDto
{
    public Guid AppointmentId { get; set; }
    public AppointmentStatus NewStatus { get; set; }
}
