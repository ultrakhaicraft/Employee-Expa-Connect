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
    public class ConversationConfiguration : IEntityTypeConfiguration<Conversation>
    {
        public void Configure(EntityTypeBuilder<Conversation> builder)
        {
            builder.ToTable("conversations");

            builder.HasKey(c => c.ConversationId);

            builder.Property(c => c.ConversationType)
                .IsRequired()
                .HasMaxLength(20);

            builder.Property(c => c.ConversationName)
                .HasMaxLength(200);

            builder.Property(c => c.ConversationAvatar)
                .HasMaxLength(500)
                .IsRequired(false); ;

            builder.Property(c => c.IsActive)
                .IsRequired()
                .HasDefaultValue(true);

            builder.Property(c => c.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.Property(c => c.UpdatedAt)
                .IsRequired()
                .HasDefaultValueSql("SYSDATETIMEOFFSET()");

            // Relationships
            builder.HasOne(c => c.Creator)
                .WithMany()
                .HasForeignKey(c => c.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasMany(c => c.Participants)
                .WithOne(p => p.Conversation)
                .HasForeignKey(p => p.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(c => c.Messages)
                .WithOne(m => m.Conversation)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            builder.HasIndex(c => c.LastMessageAt)
                .HasDatabaseName("IX_conversations_LastMessageAt");

            builder.HasIndex(c => c.CreatedBy)
                .HasDatabaseName("IX_conversations_CreatedBy");
        }
    }

    public class ConversationParticipantConfiguration : IEntityTypeConfiguration<ConversationParticipant>
    {
        public void Configure(EntityTypeBuilder<ConversationParticipant> builder)
        {
            builder.ToTable("conversation_participants");

            builder.HasKey(p => p.ParticipantId);

            builder.Property(p => p.Role)
                .IsRequired()
                .HasMaxLength(20)
                .HasDefaultValue("member");

            builder.Property(p => p.IsActive)
                .IsRequired()
                .HasDefaultValue(true);

            builder.Property(p => p.NotificationEnabled)
                .IsRequired()
                .HasDefaultValue(true);

            builder.Property(p => p.Nickname)
                .HasMaxLength(100);

            builder.Property(p => p.JoinedAt)
                .IsRequired()
                .HasDefaultValueSql("SYSDATETIMEOFFSET()");

            // Relationships
            builder.HasOne(p => p.Conversation)
                .WithMany(c => c.Participants)
                .HasForeignKey(p => p.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(p => p.User)
                .WithMany()
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            builder.HasIndex(p => p.UserId)
                .HasDatabaseName("IX_conversation_participants_UserId");

            builder.HasIndex(p => new { p.ConversationId, p.IsActive })
                .HasDatabaseName("IX_conversation_participants_ConversationId_IsActive");

            builder.HasIndex(p => new { p.ConversationId, p.UserId })
                .IsUnique()
                .HasDatabaseName("UQ_conversation_user");
        }
    }

    public class MessageConfiguration : IEntityTypeConfiguration<Message>
    {
        public void Configure(EntityTypeBuilder<Message> builder)
        {
            builder.ToTable("messages");

            builder.HasKey(m => m.MessageId);

            builder.Property(m => m.MessageType)
                .IsRequired()
                .HasMaxLength(20)
                .HasDefaultValue("text");

            builder.Property(m => m.MessageContent)
                .HasColumnType("nvarchar(max)");

            builder.Property(m => m.FileUrl)
                .HasMaxLength(500);

            builder.Property(m => m.FileName)
                .HasMaxLength(255);

            builder.Property(m => m.FileMimeType)
                .HasMaxLength(100);

            builder.Property(m => m.ThumbnailUrl)
                .HasMaxLength(500);

            builder.Property(m => m.LocationName)
                .HasMaxLength(200);

            builder.Property(m => m.IsEdited)
                .IsRequired()
                .HasDefaultValue(false);

            builder.Property(m => m.IsDeleted)
                .IsRequired()
                .HasDefaultValue(false);

            builder.Property(m => m.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("SYSDATETIMEOFFSET()");

            // Relationships
            builder.HasOne(m => m.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(m => m.ReplyToMessage)
                .WithMany()
                .HasForeignKey(m => m.ReplyToMessageId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasMany(m => m.ReadReceipts)
                .WithOne(r => r.Message)
                .HasForeignKey(r => r.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            builder.HasIndex(m => new { m.ConversationId, m.CreatedAt })
                .HasDatabaseName("IX_messages_ConversationId_CreatedAt");

            builder.HasIndex(m => m.SenderId)
                .HasDatabaseName("IX_messages_SenderId");

            builder.HasIndex(m => m.IsDeleted)
                .HasDatabaseName("IX_messages_IsDeleted")
                .HasFilter("[IsDeleted] = 0");
        }
    }

    public class MessageReadReceiptConfiguration : IEntityTypeConfiguration<MessageReadReceipt>
    {
        public void Configure(EntityTypeBuilder<MessageReadReceipt> builder)
        {
            builder.ToTable("message_read_receipts");

            builder.HasKey(r => r.ReceiptId);

            builder.Property(r => r.ReadAt)
                .IsRequired()
                .HasDefaultValueSql("SYSDATETIMEOFFSET()");

            // Relationships
            builder.HasOne(r => r.Message)
                .WithMany(m => m.ReadReceipts)
                .HasForeignKey(r => r.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            builder.HasIndex(r => r.MessageId)
                .HasDatabaseName("IX_message_read_receipts_MessageId");

            builder.HasIndex(r => r.UserId)
                .HasDatabaseName("IX_message_read_receipts_UserId");

            builder.HasIndex(r => new { r.MessageId, r.UserId })
                .IsUnique()
                .HasDatabaseName("UQ_message_user_read");
        }
    }

    public class TypingStatusConfiguration : IEntityTypeConfiguration<TypingStatus>
    {
        public void Configure(EntityTypeBuilder<TypingStatus> builder)
        {
            builder.ToTable("typing_status");

            builder.HasKey(t => t.TypingId);

            builder.Property(t => t.IsTyping)
                .IsRequired()
                .HasDefaultValue(true);

            builder.Property(t => t.StartedAt)
                .IsRequired()
                .HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.Property(t => t.LastActivityAt)
                .IsRequired()
                .HasDefaultValueSql("SYSDATETIMEOFFSET()");

            // Relationships
            builder.HasOne(t => t.Conversation)
                .WithMany()
                .HasForeignKey(t => t.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            builder.HasIndex(t => t.ConversationId)
                .HasDatabaseName("IX_typing_status_ConversationId");

            builder.HasIndex(t => new { t.ConversationId, t.UserId })
                .IsUnique()
                .HasDatabaseName("UQ_conversation_user_typing");
        }
    }
}
