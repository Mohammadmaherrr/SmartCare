using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartCare.Domain.Entities;

namespace SmartCare.Infrastructure.Data.Configurations;

public class PatientConfiguration : IEntityTypeConfiguration<Patient>
{
    public void Configure(EntityTypeBuilder<Patient> builder)
    {
        builder.Property(p => p.Gender).IsRequired().HasMaxLength(50);
        builder.Property(p => p.ContactNumber).HasMaxLength(20);
        builder.Property(p => p.Address).HasMaxLength(500);
    }
}
