using System.Text.Json.Serialization;

namespace SmartCare.Domain.Entities;

public class Prescription
{
    public Guid Id { get; set; }
    public Guid MedicalRecordId { get; set; }
    public required string MedicationName { get; set; }
    public required string Dosage { get; set; }
    public string? Instructions { get; set; }
    public DateOnly IssueDate { get; set; }

    // Navigation properties
    [JsonIgnore]
    public MedicalRecord MedicalRecord { get; set; } = null!;
}
