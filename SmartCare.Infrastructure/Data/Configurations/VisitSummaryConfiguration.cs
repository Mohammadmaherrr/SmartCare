using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartCare.Domain.Entities;

namespace SmartCare.Infrastructure.Data.Configurations;

public class VisitSummaryConfiguration : IEntityTypeConfiguration<VisitSummary>
{
    public void Configure(EntityTypeBuilder<VisitSummary> builder)
    {
        builder.HasKey(v => v.Id);

        builder.HasIndex(v => v.AppointmentId).IsUnique();

        builder.HasOne(v => v.Appointment)
            .WithOne(a => a.VisitSummary)
            .HasForeignKey<VisitSummary>(v => v.AppointmentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(v => v.Symptoms).IsRequired().HasMaxLength(1000);
        builder.Property(v => v.SymptomDuration).HasMaxLength(200);

        builder.ToTable(t => t.HasCheckConstraint(
            "CK_VisitSummaries_PainLevel",
            "\"PainLevel\" >= 0 AND \"PainLevel\" <= 10"));
    }
}
