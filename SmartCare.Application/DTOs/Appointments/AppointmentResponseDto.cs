using SmartCare.Domain.Enums;

namespace SmartCare.Application.DTOs.Appointments;

public class AppointmentResponseDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public Guid DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public DateOnly AppointmentDate { get; set; }
    public TimeOnly TimeSlot { get; set; }
    public TimeOnly EndTime { get; set; }
    public VisitType VisitType { get; set; }
    public AppointmentStatus Status { get; set; }
    public PaymentStatus PaymentStatus { get; set; }
}
