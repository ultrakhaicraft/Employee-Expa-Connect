using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class Conversation
    {
        public Guid ConversationId { get; set; }
        public string ConversationType { get; set; } // "direct" or "group" or "event"
        public string? ConversationName { get; set; }
        public string? ConversationAvatar { get; set; }
        public Guid CreatedBy { get; set; }
        public Guid? EventId { get; set; } // Link to event if this is an event chat
        public bool IsActive { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
        public DateTimeOffset? LastMessageAt { get; set; }

        // Navigation properties
        public User Creator { get; set; }
        public Event? Event { get; set; }
        public ICollection<ConversationParticipant> Participants { get; set; }
        public ICollection<Message> Messages { get; set; }

        public Conversation()
        {
            ConversationId = Guid.NewGuid();
            CreatedAt = DateTimeOffset.UtcNow;
            UpdatedAt = DateTimeOffset.UtcNow;
            IsActive = true;
            Participants = new List<ConversationParticipant>();
            Messages = new List<Message>();
        }
    }
}
