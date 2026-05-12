using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartCare.Domain.Entities;

namespace SmartCare.Infrastructure.Data.Configurations;

public class MedicalRecordConfiguration : IEntityTypeConfiguration<MedicalRecord>
{
    public void Configure(EntityTypeBuilder<MedicalRecord> builder)
    {
        builder.HasKey(m => m.Id);

        builder.HasIndex(m => m.PatientId).IsUnique();

        // Restrict (not Cascade): a Patient delete must never silently wipe clinical history.
        // Force the caller to handle records explicitly.
        builder.HasOne(m => m.Patient)
            .WithOne(p => p.MedicalRecord)
            .HasForeignKey<MedicalRecord>(m => m.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(m => m.Prescriptions)
            .WithOne(p => p.MedicalRecord)
            .HasForeignKey(p => p.MedicalRecordId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
