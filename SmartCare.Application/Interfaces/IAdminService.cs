using SmartCare.Application.DTOs.Admin;

namespace SmartCare.Application.Interfaces;

public interface IAdminService
{
    Task<IReadOnlyList<UserSummaryDto>> GetUsersAsync(string? role);
    Task<UserSummaryDto> CreateStaffAsync(CreateStaffDto dto);
    Task<UserSummaryDto> UpdateUserAsync(Guid id, UpdateUserDto dto);
    Task DeactivateUserAsync(Guid id, Guid requesterId);
    Task<AppointmentReportDto> GetAppointmentReportAsync(DateOnly? startDate, DateOnly? endDate);
    Task<VisitFrequencyReportDto> GetVisitFrequencyReportAsync(DateOnly? startDate, DateOnly? endDate);
    Task<IReadOnlyList<SystemSettingDto>> GetSettingsAsync();
    Task<SystemSettingDto> UpdateSettingAsync(UpdateSettingDto dto);
}
