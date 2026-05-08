using SmartCare.Domain.Enums;

namespace SmartCare.Application.DTOs.Appointments;

public class BookAppointmentDto
{
    // Ignored when caller is a Patient (overridden server-side from JWT claims).
    // Required when Receptionist or Admin books on behalf of a patient.
    public Guid? PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public DateOnly AppointmentDate { get; set; }
    public TimeOnly TimeSlot { get; set; }
    public VisitType VisitType { get; set; }
}
