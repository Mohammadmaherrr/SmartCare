using SmartCare.Application.DTOs.VisitSummaries;

namespace SmartCare.Application.Interfaces;

public interface IVisitSummaryService
{
    Task<VisitSummaryDto> SubmitSummaryAsync(Guid appointmentId, VisitSummaryDto dto, Guid patientId);
    Task<VisitSummaryDto> GetSummaryAsync(Guid appointmentId, Guid requestingUserId, string role);
}
