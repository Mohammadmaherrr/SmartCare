using System.Text.Json.Serialization;

namespace SmartCare.Domain.Entities;

public class Notification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public required string Message { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsRead { get; set; }

    // Navigation properties
    [JsonIgnore]
    public User User { get; set; } = null!;
}
