using FluentValidation;

namespace SmartCare.Application.DTOs.Appointments;

public class CancelAppointmentDtoValidator : AbstractValidator<CancelAppointmentDto>
{
    public CancelAppointmentDtoValidator()
    {
        // AppointmentId comes from the route, not the body — not validated here.
        RuleFor(x => x.Reason)
            .MaximumLength(500)
            .When(x => x.Reason is not null);
    }
}
