using FluentValidation;
using FluentValidation.AspNetCore;
using SmartCare.Application;

namespace SmartCare.API.Extensions;

public static class ApplicationServiceExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services,
        IConfiguration config)
    {
        services.AddCors();

        services.AddFluentValidationAutoValidation();
        services.AddValidatorsFromAssemblyContaining<ApplicationAssemblyMarker>();

        return services;
    }
}
