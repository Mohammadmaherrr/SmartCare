using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartCare.Domain.Entities;

namespace SmartCare.Infrastructure.Data.Configurations;

public class DoctorConfiguration : IEntityTypeConfiguration<Doctor>
{
    public void Configure(EntityTypeBuilder<Doctor> builder)
    {
        builder.Property(d => d.Specialization).IsRequired().HasMaxLength(200);
        builder.Property(d => d.LicenseNumber).IsRequired().HasMaxLength(100);

        builder.HasIndex(d => d.LicenseNumber).IsUnique();
    }
}
