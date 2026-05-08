using System.Text.Json.Serialization;

namespace SmartCare.Domain.Entities;

public class MedicalRecord
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public required string Diagnosis { get; set; }
    public string? TreatmentPlan { get; set; }
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [JsonIgnore]
    public Patient Patient { get; set; } = null!;
    [JsonIgnore]
    public List<Prescription> Prescriptions { get; set; } = [];
}
