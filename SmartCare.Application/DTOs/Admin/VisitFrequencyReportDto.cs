namespace SmartCare.Application.DTOs.Admin;

public class VisitFrequencyReportDto
{
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public IReadOnlyList<DailyVisitCountDto> Data { get; set; } = [];
}

public class DailyVisitCountDto
{
    public DateOnly Date { get; set; }
    public int Count { get; set; }
}
