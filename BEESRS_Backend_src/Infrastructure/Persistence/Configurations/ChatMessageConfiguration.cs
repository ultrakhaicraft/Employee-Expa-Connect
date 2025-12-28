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
    public class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
    {
        public void Configure(EntityTypeBuilder<ChatMessage> builder)
        {
            builder.ToTable("chat_messages");

            builder.HasKey(m => m.MessageId);

            builder.Property(m => m.SenderType)
                .IsRequired()
                .HasMaxLength(20);

            builder.Property(m => m.MessageText)
                .IsRequired()
                .HasMaxLength(5000);

            builder.Property(m => m.BotResponseType)
                .HasMaxLength(50);

            builder.Property(m => m.DetectedIntent)
                .HasMaxLength(100);

            builder.Property(m => m.AiConfidenceScore)
                .HasPrecision(5, 4);

            builder.Property(m => m.ReferencedPlaces)
                .HasMaxLength(2000);

            builder.Property(m => m.CreatedAt)
                .IsRequired();

            // Relationships
            builder.HasOne(m => m.ChatConversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            builder.HasIndex(m => m.ConversationId);
            builder.HasIndex(m => m.CreatedAt);
        }
    }
}
