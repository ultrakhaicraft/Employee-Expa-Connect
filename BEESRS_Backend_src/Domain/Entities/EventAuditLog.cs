using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    public class EventAuditLog
    {
        [Key]
        public Guid LogId { get; set; } = Guid.NewGuid();

        [ForeignKey("Event")]
        public Guid EventId { get; set; }

        [StringLength(50)]
        public string OldStatus { get; set; }

        [StringLength(50)]
        public string NewStatus { get; set; }

        [ForeignKey("ChangedByUser")]
        public Guid? ChangedBy { get; set; }

        public DateTimeOffset ChangedAt { get; set; } = DateTimeOffset.Now;

        [StringLength(500)]
        public string Reason { get; set; }

        public string AdditionalData { get; set; } = "{}"; // JSON - default to empty JSON object

        // Navigation Properties
        public virtual Event Event { get; set; }
        public virtual User ChangedByUser { get; set; }
    }
}







