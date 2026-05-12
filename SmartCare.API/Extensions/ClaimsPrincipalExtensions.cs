using System.Security.Claims;
using SmartCare.Application.Exceptions;

namespace SmartCare.API.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(raw) || !Guid.TryParse(raw, out var id) || id == Guid.Empty)
            throw new UnauthorizedException("Invalid or missing user identity in token.");

        return id;
    }

    public static string GetRole(this ClaimsPrincipal user)
    {
        var role = user.FindFirstValue(ClaimTypes.Role);

        if (string.IsNullOrWhiteSpace(role))
            throw new UnauthorizedException("Invalid or missing role in token.");

        return role;
    }
}
