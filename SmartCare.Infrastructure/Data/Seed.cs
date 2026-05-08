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
}
