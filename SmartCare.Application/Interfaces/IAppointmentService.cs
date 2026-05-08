using SmartCare.Application.DTOs.Appointments;

namespace SmartCare.Application.Interfaces;

public interface IAppointmentService
{
    Task<AppointmentResponseDto> BookAppointmentAsync(BookAppointmentDto dto, Guid requesterId, string requesterRole);
    Task<AppointmentResponseDto> CancelAppointmentAsync(CancelAppointmentDto dto, Guid requesterId, string requesterRole);
    Task<IReadOnlyList<AppointmentResponseDto>> GetDoctorScheduleAsync(Guid doctorId, Guid requesterId, string requesterRole);
    Task<IReadOnlyList<AppointmentResponseDto>> GetPatientAppointmentsAsync(Guid patientId, Guid requesterId, string requesterRole);
    Task<AppointmentResponseDto> UpdateAppointmentStatusAsync(UpdateStatusDto dto, Guid requesterId, string requesterRole);
}
