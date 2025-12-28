using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class ConversationParticipant
    {
        public Guid ParticipantId { get; set; }
        public Guid ConversationId { get; set; }
        public Guid UserId { get; set; }
        public string Role { get; set; } // "admin" or "member"
        public DateTimeOffset JoinedAt { get; set; }
        public DateTimeOffset? LeftAt { get; set; }
        public bool IsActive { get; set; }
        public DateTimeOffset? LastReadAt { get; set; }
        public bool NotificationEnabled { get; set; }
        public string? Nickname { get; set; }

        // Navigation properties
        public Conversation Conversation { get; set; }
        public User User { get; set; }

        public ConversationParticipant()
        {
            ParticipantId = Guid.NewGuid();
            JoinedAt = DateTimeOffset.UtcNow;
            IsActive = true;
            Role = "member";
            NotificationEnabled = true;
        }
    }
}
