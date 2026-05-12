using FluentValidation;
using SmartCare.Domain.Enums;

namespace SmartCare.Application.DTOs.Admin;

public class CreateStaffDtoValidator : AbstractValidator<CreateStaffDto>
{
    private static readonly string[] AllowedRoles = [
        nameof(UserRole.Doctor),
        nameof(UserRole.Receptionist)
    ];

    public CreateStaffDtoValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty()
            .MaximumLength(200);

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
            .Must(r => AllowedRoles.Contains(r, StringComparer.OrdinalIgnoreCase))
            .WithMessage("Role must be Doctor or Receptionist. Use the auth endpoint to register patients.");

        When(x => string.Equals(x.Role, nameof(UserRole.Doctor), StringComparison.OrdinalIgnoreCase), () =>
        {
            RuleFor(x => x.Specialization)
                .NotEmpty().WithMessage("Specialization is required for Doctor.")
                .MaximumLength(100);

            RuleFor(x => x.LicenseNumber)
                .NotEmpty().WithMessage("LicenseNumber is required for Doctor.")
                .MaximumLength(50);
        });

        When(x => string.Equals(x.Role, nameof(UserRole.Receptionist), StringComparison.OrdinalIgnoreCase), () =>
        {
            RuleFor(x => x.EmployeeId)
                .NotEmpty().WithMessage("EmployeeId is required for Receptionist.")
                .MaximumLength(50);
        });
    }
}
