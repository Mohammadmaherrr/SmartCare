using FluentValidation;

namespace SmartCare.Application.DTOs.Appointments;

public class UpdateStatusDtoValidator : AbstractValidator<UpdateStatusDto>
{
    public UpdateStatusDtoValidator()
    {
        // AppointmentId comes from the route, not the body — not validated here.
        RuleFor(x => x.NewStatus)
            .IsInEnum()
            .WithMessage("Invalid appointment status.");
    }
}
