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
    public class ChatConversationConfiguration : IEntityTypeConfiguration<ChatConversation>
    {
        public void Configure(EntityTypeBuilder<ChatConversation> builder)
        {
            builder.ToTable("chat_conversations");

            builder.HasKey(c => c.ConversationId);

            builder.Property(c => c.Title)
                .IsRequired()
                .HasMaxLength(500);

            builder.Property(c => c.ConversationType)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(c => c.IsActive)
                .IsRequired()
                .HasDefaultValue(true);

            builder.Property(c => c.StartedAt)
                .IsRequired();

            builder.Property(c => c.LastActivityAt)
                .IsRequired();

            // Relationships
            builder.HasOne(c => c.User)
                .WithMany(u => u.ChatConversations)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(c => c.Messages)
                .WithOne(m => m.ChatConversation)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            builder.HasIndex(c => c.UserId);
            builder.HasIndex(c => c.LastActivityAt);
            builder.HasIndex(c => new { c.UserId, c.IsActive });
        }
    }

}