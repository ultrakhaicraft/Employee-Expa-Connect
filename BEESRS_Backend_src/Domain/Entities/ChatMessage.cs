using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    public class ChatMessage
    {
        [Key]
        public Guid MessageId { get; set; }
        public Guid ConversationId { get; set; }
        public string? SenderType { get; set; } // User, Bot
        public string MessageText { get; set; }
        public string? BotResponseType { get; set; } // text, place_list, map, error
        public string? DetectedIntent { get; set; }
        public decimal? AiConfidenceScore { get; set; }
        public int? ProcessingTimeMs { get; set; }
        public string? ReferencedPlaces { get; set; } // JSON string of place IDs
        public DateTimeOffset CreatedAt { get; set; }

        public virtual ChatConversation ChatConversation { get; set; }
    }
}