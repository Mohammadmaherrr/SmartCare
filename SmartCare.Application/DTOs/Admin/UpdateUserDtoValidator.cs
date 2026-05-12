using FluentValidation;

namespace SmartCare.Application.DTOs.Admin;

public class UpdateUserDtoValidator : AbstractValidator<UpdateUserDto>
{
    public UpdateUserDtoValidator()
    {
        When(x => x.FullName is not null, () =>
            RuleFor(x => x.FullName).NotEmpty().MaximumLength(200));

        When(x => x.Email is not null, () =>
            RuleFor(x => x.Email).NotEmpty().EmailAddress());

        When(x => x.Specialization is not null, () =>
            RuleFor(x => x.Specialization).NotEmpty().MaximumLength(100));

        When(x => x.LicenseNumber is not null, () =>
            RuleFor(x => x.LicenseNumber).NotEmpty().MaximumLength(50));

        When(x => x.EmployeeId is not null, () =>
            RuleFor(x => x.EmployeeId).NotEmpty().MaximumLength(50));

        When(x => x.Gender is not null, () =>
            RuleFor(x => x.Gender).NotEmpty().MaximumLength(20));

        When(x => x.DateOfBirth is not null, () =>
            RuleFor(x => x.DateOfBirth)
                .Must(d => d < DateOnly.FromDateTime(DateTime.UtcNow))
                .WithMessage("DateOfBirth must be in the past."));
    }
}
