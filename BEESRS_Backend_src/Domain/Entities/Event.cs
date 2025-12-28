using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class Event
    {
        [Key]
        public Guid EventId { get; set; } = Guid.NewGuid();

        [ForeignKey("Organizer")]
        public Guid OrganizerId { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; }

        public string Description { get; set; }

        [Required]
        [StringLength(50)]
        public string EventType { get; set; }

        [Required]
        public DateTime ScheduledDate { get; set; }

        [Required]
        public TimeSpan ScheduledTime { get; set; }

        [StringLength(50)]
        public string Timezone { get; set; } = "UTC";

        public int? EstimatedDuration { get; set; }

        [Required]
        public int ExpectedAttendees { get; set; }

        public int? MaxAttendees { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? BudgetTotal { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? BudgetPerPerson { get; set; }

        [StringLength(50)]
        public string Status { get; set; } = "planning";

        public DateTimeOffset? VotingDeadline { get; set; }

        [ForeignKey("FinalPlace")]
        public Guid? FinalPlaceId { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.Now;

        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.Now;

        public DateTimeOffset? ConfirmedAt { get; set; }

        public DateTimeOffset? CancelledAt { get; set; }

        public DateTimeOffset? CompletedAt { get; set; }

        public DateTimeOffset? AiAnalysisStartedAt { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string? AiAnalysisProgress { get; set; } // JSON string for progress details

        public string? CancellationReason { get; set; }

        // Rescheduling fields
        public DateTime? PreviousScheduledDate { get; set; }
        public TimeSpan? PreviousScheduledTime { get; set; }
        public int RescheduleCount { get; set; } = 0;
        public DateTimeOffset? LastRescheduledAt { get; set; }
        public string? RescheduleReason { get; set; }

        // RSVP deadline
        public DateTimeOffset? RsvpDeadline { get; set; }

        // Acceptance threshold (0.0 to 1.0, default 0.7 = 70%)
        [Column(TypeName = "decimal(3,2)")]
        public decimal? AcceptanceThreshold { get; set; } = 0.7m;

        // Recurring event link
        [ForeignKey("RecurringEvent")]
        public Guid? RecurringEventId { get; set; }

        // Template link (if created from template)
        [ForeignKey("EventTemplate")]
        public Guid? TemplateId { get; set; }

        // Event avatar/cover image URL
        public string EventImageUrl { get; set; } = string.Empty;

        // Privacy setting: "Public" or "Private"
        [StringLength(20)]
        public string Privacy { get; set; } = "Public";

        // Navigation Properties
        public virtual User Organizer { get; set; }
        public virtual Place FinalPlace { get; set; }
        public virtual RecurringEvent? RecurringEvent { get; set; }
        public virtual EventTemplate? EventTemplate { get; set; }
        public virtual ICollection<EventParticipant> EventParticipants { get; set; } = new List<EventParticipant>();
        public virtual ICollection<EventPlaceOption> EventPlaceOptions { get; set; } = new List<EventPlaceOption>();
        public virtual ICollection<EventVote> EventVotes { get; set; } = new List<EventVote>();
        public virtual ICollection<EventCheckIn> EventCheckIns { get; set; } = new List<EventCheckIn>();
        public virtual ICollection<EventFeedback> EventFeedbacks { get; set; } = new List<EventFeedback>();
        public virtual ICollection<EventWaitlist> EventWaitlists { get; set; } = new List<EventWaitlist>();
    }

}
