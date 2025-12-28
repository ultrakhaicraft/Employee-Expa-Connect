using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class EventParticipant
    {
        [Key]
        public Guid ParticipantId { get; set; } = Guid.NewGuid();

        [ForeignKey("Event")]
        public Guid EventId { get; set; }

        [ForeignKey("User")]
        public Guid UserId { get; set; }

        [StringLength(20)]
        public string InvitationStatus { get; set; } = "pending";

        public DateTimeOffset? RsvpDate { get; set; }

        public string AdditionalNotes { get; set; } = string.Empty; // Default to empty string

        public DateTimeOffset InvitedAt { get; set; } = DateTimeOffset.Now;

        [ForeignKey("InvitedByUser")]
        public Guid? InvitedBy { get; set; }

        public DateTimeOffset? ReminderSentAt { get; set; }

        public DateTimeOffset? OneHourReminderSentAt { get; set; }

        // Navigation Properties
        public virtual Event Event { get; set; }
        public virtual User User { get; set; }
        public virtual User InvitedByUser { get; set; }
    }
}
