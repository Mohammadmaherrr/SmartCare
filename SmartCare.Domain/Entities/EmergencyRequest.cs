using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using SmartCare.Domain.Enums;

namespace SmartCare.Domain.Entities;

public class EmergencyRequest
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public DateTime RequestTime { get; set; } = DateTime.UtcNow;
    [ConcurrencyCheck]
    public EmergencyStatus Status { get; set; } = EmergencyStatus.Pending;

    // Navigation properties
    [JsonIgnore]
    public Patient Patient { get; set; } = null!;
}
