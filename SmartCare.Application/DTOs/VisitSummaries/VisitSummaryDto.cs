namespace SmartCare.Application.DTOs.VisitSummaries;

public class VisitSummaryDto
{
    public string Symptoms { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int PainLevel { get; set; }
    public string? SymptomDuration { get; set; }
}
