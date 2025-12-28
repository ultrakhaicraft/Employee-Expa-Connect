using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    public class EventFeedback
    {
        [Key]
        public Guid FeedbackId { get; set; } = Guid.NewGuid();

        [ForeignKey("Event")]
        public Guid EventId { get; set; }

        [ForeignKey("User")]
        public Guid UserId { get; set; }

        [Range(1, 5)]
        public int VenueRating { get; set; }

        [Range(1, 5)]
        public int FoodRating { get; set; }

        [Range(1, 5)]
        public int OverallRating { get; set; }

        [StringLength(1000)]
        public string? Comments { get; set; }

        [StringLength(1000)]
        public string? Suggestions { get; set; }

        public bool WouldAttendAgain { get; set; }

        public DateTimeOffset SubmittedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation Properties
        public virtual Event Event { get; set; }
        public virtual User User { get; set; }
    }
}

