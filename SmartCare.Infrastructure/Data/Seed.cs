using Microsoft.EntityFrameworkCore;
using SmartCare.Domain.Entities;
using SmartCare.Domain.Enums;

namespace SmartCare.Infrastructure.Data;

public static class Seed
{
    public static async Task SeedUsersAsync(AppDbContext context)
    {
        if (await context.Users.AnyAsync()) return;

        var admin = new Admin
        {
            Id = Guid.NewGuid(),
            FullName = "System Admin",
            Email = "admin@smartcare.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            Role = UserRole.Admin,
            AdminLevel = 1
        };

        var doctor = new Doctor
        {
            Id = Guid.NewGuid(),
            FullName = "Dr. John Smith",
            Email = "doctor@smartcare.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Doctor123!"),
            Role = UserRole.Doctor,
            Specialization = "Cardiology",
            LicenseNumber = "LIC-2024-001"
        };

        var receptionist = new Receptionist
        {
            Id = Guid.NewGuid(),
            FullName = "Jane Doe",
            Email = "reception@smartcare.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Reception123!"),
            Role = UserRole.Receptionist,
            EmployeeId = "EMP-001"
        };

        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            FullName = "Alice Johnson",
            Email = "patient@smartcare.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Patient123!"),
            Role = UserRole.Patient,
            DateOfBirth = new DateOnly(1990, 6, 15),
            Gender = "Female",
            ContactNumber = "555-0100",
            Address = "123 Main St"
        };

        context.Admins.Add(admin);
        context.Doctors.Add(doctor);
        context.Receptionists.Add(receptionist);
        context.Patients.Add(patient);

        await context.SaveChangesAsync();
    }

    public static async Task SeedClinicsAsync(AppDbContext context)
    {
        if (await context.Clinics.AnyAsync()) return;

        var clinics = new List<Clinic>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Jordan Hospital",
                Address = "Queen Alia St, Shmeisani, Amman",
                Latitude = 31.9869,
                Longitude = 35.8969,
                PhoneNumber = "+962-6-560-8080",
                WorkingHours = "Sat-Thu 08:00-22:00, Fri 10:00-22:00"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Islamic Hospital",
                Address = "Queen Zein Al Sharaf St, Amman",
                Latitude = 31.9772,
                Longitude = 35.8688,
                PhoneNumber = "+962-6-477-8111",
                WorkingHours = "24/7"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Al-Khalidi Medical Center",
                Address = "Ibn Khaldoun St, 3rd Circle, Amman",
                Latitude = 31.9693,
                Longitude = 35.8977,
                PhoneNumber = "+962-6-464-4281",
                WorkingHours = "Sat-Thu 08:00-20:00, Fri 10:00-18:00"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "King Hussein Medical Center",
                Address = "Al-Jundi Al-Majhool Sq, Amman",
                Latitude = 31.9913,
                Longitude = 35.8803,
                PhoneNumber = "+962-6-510-0500",
                WorkingHours = "24/7"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Irbid Specialty Hospital",
                Address = "University St, Irbid",
                Latitude = 32.5504,
                Longitude = 35.8437,
                PhoneNumber = "+962-2-710-0700",
                WorkingHours = "Sat-Thu 08:00-22:00, Fri 10:00-20:00"
            }
        };

        context.Clinics.AddRange(clinics);
        await context.SaveChangesAsync();
    }

    public static async Task SeedSystemSettingsAsync(AppDbContext context)
    {
        var defaults = new Dictionary<string, string>
        {
            ["NoShowFee"] = "5",
            ["GeneralConsultationDuration"] = "30",
            ["FollowUpDuration"] = "15",
            ["AnnualCheckupDuration"] = "45"
        };

        var existingKeys = await context.SystemSettings.Select(s => s.Key).ToListAsync();

        var missing = defaults.Where(d => !existingKeys.Contains(d.Key)).ToList();
        if (missing.Count == 0) return;

        context.SystemSettings.AddRange(missing.Select(d => new SystemSettings
        {
            Id = Guid.NewGuid(),
            Key = d.Key,
            Value = d.Value
        }));

        await context.SaveChangesAsync();
    }
}
