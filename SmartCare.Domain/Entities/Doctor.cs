using System.Text.Json.Serialization;

namespace SmartCare.Domain.Entities;

public class Doctor : User
{
    public required string Specialization { get; set; }
    public required string LicenseNumber { get; set; }

    // Navigation properties
    [JsonIgnore]
    public List<Appointment> Appointments { get; set; } = [];
}
