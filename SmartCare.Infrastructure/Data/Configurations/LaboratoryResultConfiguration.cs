using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartCare.Domain.Entities;

namespace SmartCare.Infrastructure.Data.Configurations;

public class LaboratoryResultConfiguration : IEntityTypeConfiguration<LaboratoryResult>
{
    public void Configure(EntityTypeBuilder<LaboratoryResult> builder)
    {
        builder.HasKey(l => l.Id);
        builder.HasIndex(l => l.PatientId);

        builder.HasOne(l => l.Patient)
            .WithMany(p => p.LaboratoryResults)
            .HasForeignKey(l => l.PatientId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property(l => l.TestName).IsRequired().HasMaxLength(200);
        builder.Property(l => l.ResultValue).IsRequired().HasMaxLength(500);
    }
}
