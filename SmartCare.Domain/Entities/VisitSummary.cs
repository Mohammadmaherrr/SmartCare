using System.Text.Json.Serialization;

namespace SmartCare.Domain.Entities;

public class VisitSummary
{
    public Guid Id { get; set; }
    public Guid AppointmentId { get; set; }
    public required string Symptoms { get; set; }
    public string? Description { get; set; }
    public int PainLevel { get; set; }
    public string? SymptomDuration { get; set; }
    public DateTime SubmissionDate { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [JsonIgnore]
    public Appointment Appointment { get; set; } = null!;
}
