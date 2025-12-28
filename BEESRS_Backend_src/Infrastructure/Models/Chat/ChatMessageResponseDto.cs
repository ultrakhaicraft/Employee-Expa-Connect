using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace Infrastructure.Models.Chat
{
    public class ChatBotMessageResponseDto
    {
        public Guid ConversationId { get; set; }
        public Guid MessageId { get; set; }
        public string Response { get; set; }
        public string Intent { get; set; }
        public List<ExtractedEntityDto> ExtractedEntities { get; set; }
        public List<SuggestedActionDto> SuggestedActions { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public object AdditionalData { get; set; }

        public DateTimeOffset Timestamp { get; set; }
        public int ProcessingTimeMs { get; set; }
        public List<PlaceSearchResult> Places { get; set; }
    }

    public class ExtractedEntityDto
    {
        public string Type { get; set; }
        public string Value { get; set; }
        public double Confidence { get; set; }
    }

    public class SuggestedActionDto
    {
        public string Type { get; set; } // open_map, show_location, get_directions
        public string Label { get; set; }
        public Dictionary<string, object> Data { get; set; }
    }
}
