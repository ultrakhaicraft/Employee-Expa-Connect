using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    public class EventShare
    {
        [Key]
        public Guid ShareId { get; set; } = Guid.NewGuid();

        [ForeignKey("Event")]
        public Guid EventId { get; set; }

        [ForeignKey("SharedWithUser")]
        public Guid? SharedWithUserId { get; set; }

        [StringLength(100)]
        public string SharedWithEmail { get; set; }

        [StringLength(20)]
        public string PermissionLevel { get; set; } = "View"; // View, Invite, Manage

        public DateTimeOffset? ExpiresAt { get; set; }

        public DateTimeOffset SharedAt { get; set; } = DateTimeOffset.Now;

        [ForeignKey("SharedByUser")]
        public Guid SharedBy { get; set; }

        // Navigation Properties
        public virtual Event Event { get; set; }
        public virtual User SharedWithUser { get; set; }
        public virtual User SharedByUser { get; set; }
    }
}




