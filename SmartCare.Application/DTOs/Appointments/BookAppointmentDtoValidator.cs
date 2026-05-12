using FluentValidation;
using SmartCare.Domain.Constants;
using SmartCare.Domain.Enums;

namespace SmartCare.Application.DTOs.Appointments;

public class BookAppointmentDtoValidator : AbstractValidator<BookAppointmentDto>
{
    private static readonly TimeOnly WorkingStart = new(9, 0);
    private static readonly TimeOnly WorkingEnd = new(17, 0);

    public BookAppointmentDtoValidator()
    {
        RuleFor(x => x.DoctorId)
            .NotEmpty();

        RuleFor(x => x.AppointmentDate)
            .Must(d => d >= DateOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("Appointment date must be today or in the future.");

        RuleFor(x => x.TimeSlot)
            .Must(t => t >= WorkingStart && t < WorkingEnd && t.Minute % 20 == 0 && t.Second == 0)
            .WithMessage("Time slot must be between 09:00 and 17:00 in 20-minute increments (e.g. 09:00, 09:20, 09:40).");

        RuleFor(x => x.TimeSlot)
            .Must((dto, slot) => slot > TimeOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("Cannot book a time slot that has already passed today.")
            .When(x => x.AppointmentDate == DateOnly.FromDateTime(DateTime.UtcNow));

        RuleFor(x => x.VisitType)
            .IsInEnum()
            .WithMessage("Invalid visit type.");

        RuleFor(x => x)
            .Must(x => x.TimeSlot.AddMinutes(VisitTypeDurations.GetMinutes(x.VisitType)) <= WorkingEnd)
            .WithMessage("The appointment would end after working hours (17:00).")
            .When(x => x.VisitType is VisitType.GeneralConsultation
                            or VisitType.FollowUp
                            or VisitType.AnnualCheckup);
    }
}
