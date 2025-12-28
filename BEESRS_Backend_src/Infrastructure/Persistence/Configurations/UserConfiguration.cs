using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Persistence.Configurations
{
    public class UserConfiguration : IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            builder.ToTable("users");

            builder.HasKey(u => u.UserId);

            builder.Property(u => u.EmployeeId)
                .IsRequired()
                .HasMaxLength(20);

            builder.HasIndex(u => u.EmployeeId)
                .IsUnique();

            builder.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(100);

            builder.HasIndex(u => u.Email)
                .IsUnique();

            builder.HasCheckConstraint("CK_users_email_domain", "[email] LIKE '%@fpt.edu.vn'");

            // Configure relationships
            builder.HasOne(u => u.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(u => u.UserProfile)
                .WithOne(up => up.User)
                .HasForeignKey<UserProfile>(up => up.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }

    public class PlaceConfiguration : IEntityTypeConfiguration<Place>
    {
        public void Configure(EntityTypeBuilder<Place> builder)
        {
            builder.ToTable("places");

            builder.HasKey(p => p.PlaceId);

            builder.Property(p => p.Latitude)
                .IsRequired()
                .HasPrecision(10, 8);

            builder.Property(p => p.Longitude)
                .IsRequired()
                .HasPrecision(11, 8);

            builder.Property(p => p.AverageRating)
                .HasPrecision(3, 2)
                .HasDefaultValue(0.00m);

            // Configure check constraints
            builder.HasCheckConstraint("CK_price_level", "[price_level] >= 1 AND [price_level] <= 5");
            builder.HasCheckConstraint("CK_average_rating", "[average_rating] >= 0 AND [average_rating] <= 5");

            // Configure relationships
            builder.HasOne(p => p.PlaceCategory)
                .WithMany(pc => pc.Places)
                .HasForeignKey(p => p.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(p => p.CreatedByUser)
                .WithMany(u => u.CreatedPlaces)
                .HasForeignKey(p => p.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }   
}
