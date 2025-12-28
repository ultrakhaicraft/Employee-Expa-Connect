using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class Message
    {
        public Guid MessageId { get; set; }
        public Guid ConversationId { get; set; }
        public Guid SenderId { get; set; }

        public string MessageType { get; set; } // "text", "image", "file", "video", "audio", "location"

        // ✅ FIX: Đổi các string thành nullable (string?)
        public string? MessageContent { get; set; }

        // File-related fields - NULLABLE
        public string? FileUrl { get; set; }
        public string? FileName { get; set; }
        public long? FileSize { get; set; }
        public string? FileMimeType { get; set; }  // ⭐ KEY FIX - Thêm ?
        public string? ThumbnailUrl { get; set; }
        public int? Duration { get; set; }

        // Location-related fields - NULLABLE
        public string? LocationName { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }

        public Guid? ReplyToMessageId { get; set; }
        public bool IsEdited { get; set; }
        public bool IsDeleted { get; set; }
        public DateTimeOffset? EditedAt { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
        public DateTimeOffset CreatedAt { get; set; }

        // Navigation properties
        public Conversation Conversation { get; set; }
        public User Sender { get; set; }
        public Message ReplyToMessage { get; set; }
        public ICollection<MessageReadReceipt> ReadReceipts { get; set; }

        public Message()
        {
            MessageId = Guid.NewGuid();
            CreatedAt = DateTimeOffset.UtcNow;
            MessageType = "text";
            IsEdited = false;
            IsDeleted = false;
            ReadReceipts = new List<MessageReadReceipt>();
        }
    }
}