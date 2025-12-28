using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.Chat
{
    public class ChatBotMessageRequestDto
    {
        public Guid? ConversationId { get; set; }
        public string Message { get; set; }
        public string Language { get; set; } = "vi";
        public UserLocationDto Location { get; set; }
    }

    public class UserLocationDto
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Address { get; set; }
    }
}
