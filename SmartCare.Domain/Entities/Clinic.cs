namespace SmartCare.Domain.Entities;

public class Clinic
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Address { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? PhoneNumber { get; set; }
    public string? WorkingHours { get; set; }
}
