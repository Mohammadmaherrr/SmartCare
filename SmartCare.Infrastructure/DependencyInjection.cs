using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SmartCare.Application.Interfaces;
using SmartCare.Infrastructure.Data;
using SmartCare.Infrastructure.Repositories;
using SmartCare.Infrastructure.Services;

namespace SmartCare.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<AppDbContext>(opt =>
            opt.UseNpgsql(config.GetConnectionString("DefaultConnection")));

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAppointmentService, AppointmentService>();
        services.AddScoped<IMedicalRecordService, MedicalRecordService>();
        services.AddScoped<IVisitSummaryService, VisitSummaryService>();
        services.AddScoped<IEmergencyService, EmergencyService>();
        services.AddScoped<IAdminService, AdminService>();
        services.AddHostedService<AppointmentReminderService>();

        return services;
    }
}
