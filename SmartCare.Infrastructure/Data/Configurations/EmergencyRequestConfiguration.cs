using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartCare.Domain.Entities;

namespace SmartCare.Infrastructure.Data.Configurations;

public class EmergencyRequestConfiguration : IEntityTypeConfiguration<EmergencyRequest>
{
    public void Configure(EntityTypeBuilder<EmergencyRequest> builder)
    {
        builder.HasKey(e => e.Id);
        builder.HasIndex(e => e.PatientId);
        builder.HasIndex(e => e.Status);

        builder.HasOne(e => e.Patient)
            .WithMany(p => p.EmergencyRequests)
            .HasForeignKey(e => e.PatientId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
