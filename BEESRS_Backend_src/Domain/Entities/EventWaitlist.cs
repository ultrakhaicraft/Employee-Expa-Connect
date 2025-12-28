using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    public class EventWaitlist
    {
        [Key]
        public Guid WaitlistId { get; set; } = Guid.NewGuid();

        [ForeignKey("Event")]
        public Guid EventId { get; set; }

        [ForeignKey("User")]
        public Guid UserId { get; set; }

        public DateTimeOffset JoinedAt { get; set; } = DateTimeOffset.UtcNow;

        [StringLength(20)]
        public string Status { get; set; } = "waiting"; // "waiting", "notified", "accepted", "declined", "expired"

        public DateTimeOffset? NotifiedAt { get; set; }
        public DateTimeOffset? RespondedAt { get; set; }

        public int Priority { get; set; } = 0; // Higher priority = earlier in queue

        [StringLength(500)]
        public string? Notes { get; set; }

        // Navigation Properties
        public virtual Event Event { get; set; }
        public virtual User User { get; set; }
    }
}

