using System;
using System.ComponentModel.DataAnnotations;

namespace Infrastructure.Models.EventShareDTO
{
    public record EventShareCreateDto
    {
        public Guid? SharedWithUserId { get; set; }
        
        [StringLength(100)]
        public string SharedWithEmail { get; set; } = string.Empty;
        
        [StringLength(20)]
        public string PermissionLevel { get; set; } = "View"; // View, Invite, Manage
        
        public DateTimeOffset? ExpiresAt { get; set; }
    }
}


















































































