using FluentValidation;

namespace SmartCare.Application.DTOs.VisitSummaries;

public class VisitSummaryDtoValidator : AbstractValidator<VisitSummaryDto>
{
    public VisitSummaryDtoValidator()
    {
        RuleFor(x => x.Symptoms)
            .NotEmpty()
            .MaximumLength(1000);

        RuleFor(x => x.PainLevel)
            .InclusiveBetween(1, 10)
            .WithMessage("Pain level must be between 1 and 10.");

        RuleFor(x => x.Description)
            .MaximumLength(2000)
            .When(x => x.Description is not null);

        RuleFor(x => x.SymptomDuration)
            .MaximumLength(200)
            .When(x => x.SymptomDuration is not null);
    }
}
