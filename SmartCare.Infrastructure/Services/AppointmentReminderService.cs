using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SmartCare.Domain.Entities;
using SmartCare.Domain.Enums;
using SmartCare.Infrastructure.Data;

namespace SmartCare.Infrastructure.Services;

public class AppointmentReminderService(
    IServiceScopeFactory scopeFactory,
    ILogger<AppointmentReminderService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Appointment reminder service started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendRemindersAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // Never let a transient DB failure tear down the host (BackgroundService
                // default behaviour is StopHost on unhandled exceptions).
                logger.LogError(ex, "Appointment reminder tick failed; will retry next interval.");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }

    private async Task SendRemindersAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var currentTime = TimeOnly.FromDateTime(now);
        var oneHourFromNow = currentTime.AddHours(1);

        var upcoming = await context.Appointments
            .Where(a =>
                a.AppointmentDate == today &&
                a.TimeSlot > currentTime &&
                a.TimeSlot <= oneHourFromNow &&
                !a.AppointmentReminderSent &&
                (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed))
            .ToListAsync(ct);

        if (upcoming.Count == 0) return;

        var notifications = upcoming.Select(a => new Notification
        {
            UserId = a.PatientId,
            Message = $"Reminder: your appointment is at {a.TimeSlot:HH:mm} today."
        }).ToList();

        foreach (var a in upcoming)
            a.AppointmentReminderSent = true;

        context.Notifications.AddRange(notifications);
        await context.SaveChangesAsync(ct);

        logger.LogInformation("Sent {Count} appointment reminders.", upcoming.Count);
    }
}
