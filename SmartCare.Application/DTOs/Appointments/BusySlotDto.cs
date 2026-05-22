namespace SmartCare.Application.DTOs.Appointments;

public class BusySlotDto
{
    public TimeOnly TimeSlot { get; set; }
    public TimeOnly EndTime { get; set; }
}
