using FluentValidation;
using SmartCare.Domain.Enums;

namespace SmartCare.Application.DTOs.Emergencies;

public class UpdateEmergencyStatusDtoValidator : AbstractValidator<UpdateEmergencyStatusDto>
{
    public UpdateEmergencyStatusDtoValidator()
    {
        RuleFor(x => x.NewStatus)
            .Must(s => s == EmergencyStatus.Dispatched || s == EmergencyStatus.Resolved)
            .WithMessage("New status must be Dispatched or Resolved.");
    }
}
