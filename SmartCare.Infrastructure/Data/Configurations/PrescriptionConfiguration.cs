using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartCare.Domain.Entities;

namespace SmartCare.Infrastructure.Data.Configurations;

public class PrescriptionConfiguration : IEntityTypeConfiguration<Prescription>
{
    public void Configure(EntityTypeBuilder<Prescription> builder)
    {
        builder.HasKey(p => p.Id);
        builder.HasIndex(p => p.MedicalRecordId);

        builder.Property(p => p.MedicationName).IsRequired().HasMaxLength(200);
        builder.Property(p => p.Dosage).IsRequired().HasMaxLength(200);
        builder.Property(p => p.Instructions).HasMaxLength(1000);
    }
}
