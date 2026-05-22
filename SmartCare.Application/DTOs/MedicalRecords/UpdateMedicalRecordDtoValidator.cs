using FluentValidation;

namespace SmartCare.Application.DTOs.MedicalRecords;

public class UpdateMedicalRecordDtoValidator : AbstractValidator<UpdateMedicalRecordDto>
{
    public UpdateMedicalRecordDtoValidator()
    {
        RuleFor(x => x.Diagnosis)
            .NotEmpty()
            .MaximumLength(500);

        RuleFor(x => x.TreatmentPlan)
            .MaximumLength(1000)
            .When(x => x.TreatmentPlan is not null);
    }
}
