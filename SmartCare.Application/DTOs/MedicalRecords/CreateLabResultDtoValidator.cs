using FluentValidation;

namespace SmartCare.Application.DTOs.MedicalRecords;

public class CreateLabResultDtoValidator : AbstractValidator<CreateLabResultDto>
{
    public CreateLabResultDtoValidator()
    {
        RuleFor(x => x.PatientId)
            .NotEmpty();

        RuleFor(x => x.TestName)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.ResultValue)
            .NotEmpty()
            .MaximumLength(500);

        RuleFor(x => x.ResultDate)
            .NotEmpty()
            .Must(d => d <= DateOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("Result date cannot be in the future.");
    }
}
