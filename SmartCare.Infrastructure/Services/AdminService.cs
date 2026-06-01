using Microsoft.EntityFrameworkCore;
using SmartCare.Application.DTOs.Admin;
using SmartCare.Application.Exceptions;
using SmartCare.Application.Interfaces;
using SmartCare.Domain.Entities;
using SmartCare.Domain.Enums;
using SmartCare.Infrastructure.Data;

namespace SmartCare.Infrastructure.Services;

public class AdminService(AppDbContext context) : IAdminService
{
    public async Task<IReadOnlyList<UserSummaryDto>> GetUsersAsync(string? role)
    {
        UserRole? parsedRole = null;
        if (role is not null)
        {
            if (!Enum.TryParse<UserRole>(role, ignoreCase: true, out var r))
                throw new BadRequestException($"Invalid role '{role}'. Valid values: Admin, Doctor, Receptionist, Patient.");
            parsedRole = r;
        }

        var query = context.Users.AsQueryable();
        if (parsedRole is not null)
            query = query.Where(u => u.Role == parsedRole);

        var users = await query.OrderBy(u => u.Role).ThenBy(u => u.FullName).ToListAsync();
        return users.Select(ToDto).ToList();
    }

    public async Task<UserSummaryDto> CreateStaffAsync(CreateStaffDto dto)
    {
        if (await context.Users.AnyAsync(u => u.Email == dto.Email))
            throw new ConflictException("Email is already registered.");

        // Role is validated to Doctor or Receptionist by the FluentValidation validator
        Enum.TryParse<UserRole>(dto.Role, ignoreCase: true, out var role);

        User user = role switch
        {
            UserRole.Doctor => new Doctor
            {
                Id = Guid.NewGuid(),
                FullName = dto.FullName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = UserRole.Doctor,
                Specialization = dto.Specialization!,
                LicenseNumber = dto.LicenseNumber!
            },
            UserRole.Receptionist => new Receptionist
            {
                Id = Guid.NewGuid(),
                FullName = dto.FullName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = UserRole.Receptionist,
                EmployeeId = dto.EmployeeId!
            },
            _ => throw new BadRequestException("Role must be Doctor or Receptionist.")
        };

        await context.Users.AddAsync(user);
        await context.SaveChangesAsync();

        return ToDto(user);
    }

    public async Task<UserSummaryDto> UpdateUserAsync(Guid id, UpdateUserDto dto)
    {
        if (id == Guid.Empty)
            throw new BadRequestException("User ID is required.");

        var user = await context.Users.FindAsync(id)
            ?? throw new BadRequestException("User not found.");

        if (dto.Email is not null && dto.Email != user.Email)
        {
            if (await context.Users.AnyAsync(u => u.Email == dto.Email && u.Id != id))
                throw new ConflictException("Email is already registered.");
            user.Email = dto.Email;
        }

        if (dto.FullName is not null)
            user.FullName = dto.FullName;

        switch (user)
        {
            case Doctor doctor:
                if (dto.Specialization is not null) doctor.Specialization = dto.Specialization;
                if (dto.LicenseNumber is not null) doctor.LicenseNumber = dto.LicenseNumber;
                break;

            case Receptionist receptionist:
                if (dto.EmployeeId is not null) receptionist.EmployeeId = dto.EmployeeId;
                break;

            case Patient patient:
                if (dto.DateOfBirth is not null) patient.DateOfBirth = dto.DateOfBirth.Value;
                if (dto.Gender is not null) patient.Gender = dto.Gender;
                if (dto.ContactNumber is not null) patient.ContactNumber = dto.ContactNumber;
                if (dto.Address is not null) patient.Address = dto.Address;
                break;
        }

        await context.SaveChangesAsync();
        return ToDto(user);
    }

    public async Task DeactivateUserAsync(Guid id, Guid requesterId)
    {
        if (id == Guid.Empty)
            throw new BadRequestException("User ID is required.");

        if (id == requesterId)
            throw new BadRequestException("You cannot deactivate your own account.");

        var user = await context.Users.FindAsync(id)
            ?? throw new BadRequestException("User not found.");

        if (user.AccountStatus == AccountStatus.Blocked)
            throw new BadRequestException("User account is already deactivated.");

        user.AccountStatus = AccountStatus.Blocked;
        await context.SaveChangesAsync();
    }

    public async Task<AppointmentReportDto> GetAppointmentReportAsync(DateOnly? startDate, DateOnly? endDate)
    {
        if (startDate is not null && endDate is not null && startDate > endDate)
            throw new BadRequestException("startDate must be on or before endDate.");

        var query = context.Appointments.Include(a => a.Doctor).AsQueryable();

        if (startDate is not null) query = query.Where(a => a.AppointmentDate >= startDate);
        if (endDate is not null) query = query.Where(a => a.AppointmentDate <= endDate);

        var appointments = await query.ToListAsync();

        var byDoctor = appointments
            .GroupBy(a => new { a.DoctorId, a.Doctor.FullName })
            .Select(g => new DoctorAppointmentBreakdownDto
            {
                DoctorId = g.Key.DoctorId,
                DoctorName = g.Key.FullName,
                Total = g.Count(),
                Completed = g.Count(a => a.Status == AppointmentStatus.Completed),
                NoShows = g.Count(a => a.Status == AppointmentStatus.NoShow),
                Cancelled = g.Count(a => a.Status == AppointmentStatus.Cancelled)
            })
            .OrderByDescending(d => d.Total)
            .ToList();

        return new AppointmentReportDto
        {
            StartDate = startDate,
            EndDate = endDate,
            Total = appointments.Count,
            Completed = appointments.Count(a => a.Status == AppointmentStatus.Completed),
            NoShows = appointments.Count(a => a.Status == AppointmentStatus.NoShow),
            Cancelled = appointments.Count(a => a.Status == AppointmentStatus.Cancelled),
            Pending = appointments.Count(a => a.Status == AppointmentStatus.Pending),
            Confirmed = appointments.Count(a => a.Status == AppointmentStatus.Confirmed),
            ByDoctor = byDoctor
        };
    }

    public async Task<VisitFrequencyReportDto> GetVisitFrequencyReportAsync(DateOnly? startDate, DateOnly? endDate)
    {
        if (startDate is not null && endDate is not null && startDate > endDate)
            throw new BadRequestException("startDate must be on or before endDate.");

        var query = context.Appointments
            .Where(a => a.Status != AppointmentStatus.Cancelled)
            .AsQueryable();

        if (startDate is not null) query = query.Where(a => a.AppointmentDate >= startDate);
        if (endDate is not null) query = query.Where(a => a.AppointmentDate <= endDate);

        var daily = await query
            .GroupBy(a => a.AppointmentDate)
            .Select(g => new DailyVisitCountDto { Date = g.Key, Count = g.Count() })
            .OrderBy(d => d.Date)
            .ToListAsync();

        return new VisitFrequencyReportDto
        {
            StartDate = startDate,
            EndDate = endDate,
            Data = daily
        };
    }

    public async Task<IReadOnlyList<SystemSettingDto>> GetSettingsAsync()
    {
        var settings = await context.SystemSettings
            .OrderBy(s => s.Key)
            .ToListAsync();

        return settings.Select(s => new SystemSettingDto { Key = s.Key, Value = s.Value }).ToList();
    }

    public async Task<SystemSettingDto> UpdateSettingAsync(UpdateSettingDto dto)
    {
        var setting = await context.SystemSettings
            .FirstOrDefaultAsync(s => s.Key == dto.Key)
            ?? throw new BadRequestException($"Setting '{dto.Key}' not found.");

        setting.Value = dto.Value;
        await context.SaveChangesAsync();

        return new SystemSettingDto { Key = setting.Key, Value = setting.Value };
    }

    private static UserSummaryDto ToDto(User user)
    {
        var dto = new UserSummaryDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role.ToString(),
            AccountStatus = user.AccountStatus.ToString()
        };

        switch (user)
        {
            case Doctor d:
                dto.Specialization = d.Specialization;
                dto.LicenseNumber = d.LicenseNumber;
                break;
            case Receptionist r:
                dto.EmployeeId = r.EmployeeId;
                break;
            case Patient p:
                dto.DateOfBirth = p.DateOfBirth;
                dto.Gender = p.Gender;
                dto.ContactNumber = p.ContactNumber;
                dto.Address = p.Address;
                break;
            case Admin a:
                dto.AdminLevel = a.AdminLevel;
                break;
        }

        return dto;
    }
}
