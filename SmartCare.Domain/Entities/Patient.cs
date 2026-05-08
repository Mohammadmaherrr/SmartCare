using System.Text.Json.Serialization;

namespace SmartCare.Domain.Entities;

public class Patient : User
{
    public DateOnly DateOfBirth { get; set; }
    public required string Gender { get; set; }
    public string? ContactNumber { get; set; }
    public string? Address { get; set; }

    // Navigation properties
    [JsonIgnore]
    public List<Appointment> Appointments { get; set; } = [];
    [JsonIgnore]
    public MedicalRecord? MedicalRecord { get; set; }
    [JsonIgnore]
    public List<LaboratoryResult> LaboratoryResults { get; set; } = [];
    [JsonIgnore]
    public List<EmergencyRequest> EmergencyRequests { get; set; } = [];
}
