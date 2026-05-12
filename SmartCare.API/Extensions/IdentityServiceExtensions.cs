using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace SmartCare.API.Extensions;

public static class IdentityServiceExtensions
{
    public static IServiceCollection AddIdentityServices(this IServiceCollection services,
        IConfiguration config)
    {
        var tokenKey = config["TokenKey"]
            ?? throw new Exception("TokenKey not found in configuration");

        if (tokenKey.Length < 64)
            throw new Exception("TokenKey must be at least 64 characters");

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(tokenKey));

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = signingKey,
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    RequireExpirationTime = true,
                    RequireSignedTokens = true,
                    ValidAlgorithms = [SecurityAlgorithms.HmacSha512],
                    ClockSkew = TimeSpan.Zero
                };
            });

        services.AddAuthorizationBuilder()
            .AddPolicy("RequireAdminRole", policy => policy.RequireRole("Admin"))
            .AddPolicy("RequireDoctorRole", policy => policy.RequireRole("Admin", "Doctor"))
            .AddPolicy("RequireReceptionistRole", policy => policy.RequireRole("Admin", "Receptionist"))
            .AddPolicy("RequirePatientRole", policy => policy.RequireRole("Patient"));

        return services;
    }
}
