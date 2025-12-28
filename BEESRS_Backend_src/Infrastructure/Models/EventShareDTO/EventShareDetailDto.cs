using System;

namespace Infrastructure.Models.EventShareDTO
{
    public record EventShareDetailDto
    {
        public Guid ShareId { get; set; }
        public Guid EventId { get; set; }
        public Guid? SharedWithUserId { get; set; }
        public string? SharedWithEmail { get; set; }
        public string? PermissionLevel { get; set; }
        public DateTimeOffset? ExpiresAt { get; set; }
        public DateTimeOffset SharedAt { get; set; }
        public Guid SharedBy { get; set; }
        public string SharedByUserName { get; set; } = string.Empty;
        public string SharedWithUserName { get; set; } = string.Empty;
    }
}


















































































