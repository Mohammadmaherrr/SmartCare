using Microsoft.EntityFrameworkCore;
using SmartCare.Application.DTOs.Auth;
using SmartCare.Application.Exceptions;
using SmartCare.Application.Interfaces;
using SmartCare.Domain.Entities;
using SmartCare.Domain.Enums;
using SmartCare.Infrastructure.Data;

namespace SmartCare.Infrastructure.Services;

public class AuthService(AppDbContext context, ITokenService tokenService) : IAuthService
{
    private const int MaxFailedAttempts = 5;

    public async Task<AuthResponseDto> RegisterPatientAsync(RegisterDto dto)
    {
        if (!dto.DateOfBirth.HasValue)
            throw new BadRequestException("DateOfBirth is required for patient registration.");
        if (string.IsNullOrWhiteSpace(dto.Gender))
            throw new BadRequestException("Gender is required for patient registration.");

        await EnsureEmailUniqueAsync(dto.Email);

        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            FullName = dto.FullName,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = UserRole.Patient,
            DateOfBirth = dto.DateOfBirth.Value,
            Gender = dto.Gender,
            ContactNumber = dto.ContactNumber,
            Address = dto.Address
        };

        await context.Patients.AddAsync(patient);
        await context.SaveChangesAsync();

        return BuildResponse(patient);
    }

    public async Task<AuthResponseDto> RegisterStaffAsync(RegisterDto dto)
    {
        if (!Enum.TryParse<UserRole>(dto.Role, ignoreCase: true, out var role) || role == UserRole.Patient)
            throw new ConflictException("Invalid role for staff registration. Use the patient register endpoint to register patients.");

        await EnsureEmailUniqueAsync(dto.Email);

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
            UserRole.Admin => new Admin
            {
                Id = Guid.NewGuid(),
                FullName = dto.FullName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = UserRole.Admin,
                AdminLevel = dto.AdminLevel ?? 1
            },
            _ => throw new ConflictException("Unsupported role.")
        };

        await context.Users.AddAsync(user);
        await context.SaveChangesAsync();

        return BuildResponse(user);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var user = await context.Users
            .FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null)
            throw new UnauthorizedException("Invalid email or password.");

        if (user.AccountStatus == AccountStatus.Blocked)
            throw new UnauthorizedException("Account has been blocked due to too many failed login attempts.");

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= MaxFailedAttempts)
                user.AccountStatus = AccountStatus.Blocked;

            await context.SaveChangesAsync();
            throw new UnauthorizedException("Invalid email or password.");
        }

        user.FailedLoginAttempts = 0;
        await context.SaveChangesAsync();

        return BuildResponse(user);
    }

    private async Task EnsureEmailUniqueAsync(string email)
    {
        if (await context.Users.AnyAsync(u => u.Email == email))
            throw new ConflictException("Email is already registered.");
    }

    private AuthResponseDto BuildResponse(User user) => new()
    {
        Token = tokenService.CreateToken(user),
        Role = user.Role.ToString(),
        UserId = user.Id,
        FullName = user.FullName
    };
}
