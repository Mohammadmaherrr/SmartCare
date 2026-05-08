using System.Text.Json.Serialization;

namespace SmartCare.Domain.Entities;

public class LaboratoryResult
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public required string TestName { get; set; }
    public required string ResultValue { get; set; }
    public DateOnly ResultDate { get; set; }

    // Navigation properties
    [JsonIgnore]
    public Patient Patient { get; set; } = null!;
}
