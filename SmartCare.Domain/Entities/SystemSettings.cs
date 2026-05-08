namespace SmartCare.Domain.Entities;

public class SystemSettings
{
    public Guid Id { get; set; }
    public required string Key { get; set; }
    public required string Value { get; set; }
}
