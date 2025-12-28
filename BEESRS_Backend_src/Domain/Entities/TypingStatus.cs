using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class TypingStatus
    {
        public Guid TypingId { get; set; }
        public Guid ConversationId { get; set; }
        public Guid UserId { get; set; }
        public bool IsTyping { get; set; }
        public DateTimeOffset StartedAt { get; set; }
        public DateTimeOffset LastActivityAt { get; set; }

        // Navigation properties
        public Conversation Conversation { get; set; }
        public User User { get; set; }

        public TypingStatus()
        {
            TypingId = Guid.NewGuid();
            StartedAt = DateTimeOffset.UtcNow;
            LastActivityAt = DateTimeOffset.UtcNow;
            IsTyping = true;
        }
    }
}
