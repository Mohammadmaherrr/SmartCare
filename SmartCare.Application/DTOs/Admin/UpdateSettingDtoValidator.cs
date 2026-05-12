using FluentValidation;

namespace SmartCare.Application.DTOs.Admin;

public class UpdateSettingDtoValidator : AbstractValidator<UpdateSettingDto>
{
    public UpdateSettingDtoValidator()
    {
        RuleFor(x => x.Key)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Value)
            .NotEmpty();
    }
}
