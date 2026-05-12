namespace SmartCare.Application.DTOs.Emergencies;

public class NearbyClinicDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? WorkingHours { get; set; }
    public double DistanceKm { get; set; }
}
