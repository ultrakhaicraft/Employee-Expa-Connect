using System;

namespace Infrastructure.Models.EventShareDTO
{
    public class EventShareViewDto
    {
        public Guid ShareId { get; set; }
        public Guid EventId { get; set; }
        public string EventTitle { get; set; } = string.Empty;
        public string SharedByUserName { get; set; } = string.Empty;
        public DateTimeOffset SharedAt { get; set; }
        public string PermissionLevel { get; set; } = string.Empty;
    }
}


















































































