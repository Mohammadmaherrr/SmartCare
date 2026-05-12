using System.Text.Json.Serialization;
using SmartCare.Domain.Enums;

namespace SmartCare.Domain.Entities;

public class Appointment
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public DateOnly AppointmentDate { get; set; }
    public TimeOnly TimeSlot { get; set; }
    public VisitType VisitType { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.OnHold;
    public bool AppointmentReminderSent { get; set; }

    // Navigation properties
    [JsonIgnore]
    public Patient Patient { get; set; } = null!;
    [JsonIgnore]
    public Doctor Doctor { get; set; } = null!;
    [JsonIgnore]
    public VisitSummary? VisitSummary { get; set; }
}
