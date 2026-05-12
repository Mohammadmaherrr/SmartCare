using FluentValidation;

namespace SmartCare.Application.DTOs.MedicalRecords;

public class CreatePrescriptionDtoValidator : AbstractValidator<CreatePrescriptionDto>
{
    public CreatePrescriptionDtoValidator()
    {
        RuleFor(x => x.MedicalRecordId)
            .NotEmpty();

        RuleFor(x => x.MedicationName)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Dosage)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.Instructions)
            .MaximumLength(500)
            .When(x => x.Instructions is not null);

        RuleFor(x => x.IssueDate)
            .NotEmpty()
            .Must(d => d <= DateOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("Issue date cannot be in the future.");
    }
}
