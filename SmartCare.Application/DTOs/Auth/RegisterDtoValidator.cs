using FluentValidation;
using SmartCare.Domain.Enums;

namespace SmartCare.Application.DTOs.Auth;

public class RegisterDtoValidator : AbstractValidator<RegisterDto>
{
    private static readonly string[] ValidRoles =
        Enum.GetNames<UserRole>(); // ["Admin","Doctor","Receptionist","Patient"]

    public RegisterDtoValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress();

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(8)
            .Matches("[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
            .Matches("[0-9]").WithMessage("Password must contain at least one number.");

        RuleFor(x => x.Role)
            .NotEmpty()
            .Must(r => ValidRoles.Contains(r, StringComparer.OrdinalIgnoreCase))
            .WithMessage($"Role must be one of: {string.Join(", ", ValidRoles)}.");

        // Doctor-specific rules
        When(x => string.Equals(x.Role, nameof(UserRole.Doctor), StringComparison.OrdinalIgnoreCase), () =>
        {
            RuleFor(x => x.Specialization)
                .NotEmpty().WithMessage("Specialization is required for Doctor registration.")
                .MaximumLength(100);

            RuleFor(x => x.LicenseNumber)
                .NotEmpty().WithMessage("LicenseNumber is required for Doctor registration.")
                .MaximumLength(50);
        });

        // Patient-specific rules
        When(x => string.Equals(x.Role, nameof(UserRole.Patient), StringComparison.OrdinalIgnoreCase), () =>
        {
            RuleFor(x => x.DateOfBirth)
                .NotNull().WithMessage("DateOfBirth is required for Patient registration.")
                .Must(d => d < DateOnly.FromDateTime(DateTime.UtcNow))
                .WithMessage("DateOfBirth must be in the past.");

            RuleFor(x => x.Gender)
                .NotEmpty().WithMessage("Gender is required for Patient registration.")
                .MaximumLength(20);
        });

        // Receptionist-specific rules
        When(x => string.Equals(x.Role, nameof(UserRole.Receptionist), StringComparison.OrdinalIgnoreCase), () =>
        {
            RuleFor(x => x.EmployeeId)
                .NotEmpty().WithMessage("EmployeeId is required for Receptionist registration.")
                .MaximumLength(50);
        });

        // Admin-specific rules
        When(x => string.Equals(x.Role, nameof(UserRole.Admin), StringComparison.OrdinalIgnoreCase), () =>
        {
            RuleFor(x => x.AdminLevel)
                .InclusiveBetween(1, 10).WithMessage("AdminLevel must be between 1 and 10.")
                .When(x => x.AdminLevel.HasValue);
        });
    }
}
