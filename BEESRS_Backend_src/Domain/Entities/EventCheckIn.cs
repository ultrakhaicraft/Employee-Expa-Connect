using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    public class EventCheckIn
    {
        [Key]
        public Guid CheckInId { get; set; } = Guid.NewGuid();

        [ForeignKey("Event")]
        public Guid EventId { get; set; }

        [ForeignKey("User")]
        public Guid UserId { get; set; }

        public DateTimeOffset CheckedInAt { get; set; } = DateTimeOffset.UtcNow;

        [StringLength(20)]
        public string? CheckInMethod { get; set; } // "qr_code", "manual", "auto"

        public double? Latitude { get; set; }

        public double? Longitude { get; set; }

        public bool IsNoShow { get; set; } = false;

        // Navigation Properties
        public virtual Event Event { get; set; }
        public virtual User User { get; set; }
    }
}

