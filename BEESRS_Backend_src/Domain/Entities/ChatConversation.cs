using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    public class ChatConversation
    {
        [Key]
        public Guid ConversationId { get; set; }
        [ForeignKey("User")]
        public Guid UserId { get; set; }
        public string Title { get; set; }
        public string ConversationType { get; set; } // place_search, general, emergency
        public bool IsActive { get; set; }
        public DateTimeOffset StartedAt { get; set; }
        public DateTimeOffset LastActivityAt { get; set; }

        // Navigation properties
        public User User { get; set; }
        public ICollection<ChatMessage> Messages { get; set; }
    }
}