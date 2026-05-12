using FluentValidation;

namespace SmartCare.Application.DTOs.MedicalRecords;

public class CreateMedicalRecordDtoValidator : AbstractValidator<CreateMedicalRecordDto>
{
    public CreateMedicalRecordDtoValidator()
    {
        RuleFor(x => x.PatientId)
            .NotEmpty();

        RuleFor(x => x.Diagnosis)
            .NotEmpty()
            .MaximumLength(500);

        RuleFor(x => x.TreatmentPlan)
            .MaximumLength(1000)
            .When(x => x.TreatmentPlan is not null);
    }
}
