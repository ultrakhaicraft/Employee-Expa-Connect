using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.Chat
{
    public class ChatBotDto
    {
        public Guid ConversationId { get; set; }
        public string Title { get; set; }
        public string ConversationType { get; set; }
        public bool IsActive { get; set; }
        public DateTimeOffset StartedAt { get; set; }
        public DateTimeOffset LastActivityAt { get; set; }
        public List<ChatBotMessageDto> Messages { get; set; }
    }

    public class ChatBotMessageDto
    {
        public Guid MessageId { get; set; }
        public string SenderType { get; set; }
        public string MessageText { get; set; }
        public string BotResponseType { get; set; }
        public string DetectedIntent { get; set; }
        public decimal? AiConfidenceScore { get; set; }
        public int? ProcessingTimeMs { get; set; }
        public object ReferencedPlaces { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
}
