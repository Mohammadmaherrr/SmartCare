using SmartCare.Domain.Enums;

namespace SmartCare.Domain.Constants;

public static class VisitTypeDurations
{
    public static readonly IReadOnlyDictionary<VisitType, int> Minutes =
        new Dictionary<VisitType, int>
        {
            [VisitType.GeneralConsultation] = 30,
            [VisitType.FollowUp] = 15,
            [VisitType.AnnualCheckup] = 45,
        };

    public static int GetMinutes(VisitType visitType) => Minutes[visitType];
}
