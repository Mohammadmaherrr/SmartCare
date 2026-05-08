using System.Text.Json.Serialization;
using SmartCare.Domain.Enums;

namespace SmartCare.Domain.Entities;

public abstract class User
{
    public Guid Id { get; set; }
    public required string FullName { get; set; }
    public required string Email { get; set; }
    [JsonIgnore]
    public required string PasswordHash { get; set; }
    public UserRole Role { get; set; }
    public AccountStatus AccountStatus { get; set; } = AccountStatus.Active;
    [JsonIgnore]
    public int FailedLoginAttempts { get; set; }

    // Navigation properties
    [JsonIgnore]
    public List<Notification> Notifications { get; set; } = [];
}
