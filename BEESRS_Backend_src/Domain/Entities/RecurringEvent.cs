using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    public class RecurringEvent
    {
        [Key]
        public Guid RecurringEventId { get; set; } = Guid.NewGuid();

        [ForeignKey("Organizer")]
        public Guid OrganizerId { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; }

        public string? Description { get; set; }

        [Required]
        [StringLength(50)]
        public string EventType { get; set; }

        [Required]
        [StringLength(20)]
        public string RecurrencePattern { get; set; } // "daily", "weekly", "monthly", "yearly", "custom"

        // For weekly recurrence
        public string? DaysOfWeek { get; set; } // JSON array: ["Monday", "Wednesday", "Friday"]

        // For monthly recurrence
        public int? DayOfMonth { get; set; } // Day 1-31, or null for last day

        // For yearly recurrence
        public int? Month { get; set; } // 1-12
        public int? DayOfYear { get; set; } // Day 1-365

        // Time settings
        [Required]
        public TimeSpan ScheduledTime { get; set; }

        public int? EstimatedDuration { get; set; }

        public int ExpectedAttendees { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? BudgetPerPerson { get; set; }

        // Recurrence range
        [Required]
        public DateTime StartDate { get; set; }

        public DateTime? EndDate { get; set; } // null = no end date
        public int? OccurrenceCount { get; set; } // null = unlimited

        // Status
        [StringLength(20)]
        public string Status { get; set; } = "active"; // "active", "paused", "completed", "cancelled"

        // Auto-generation settings
        public bool AutoCreateEvents { get; set; } = true; // Automatically create events based on pattern
        public int DaysInAdvance { get; set; } = 7; // Create events N days in advance

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? LastGeneratedAt { get; set; }

        // Navigation Properties
        public virtual User Organizer { get; set; }
        public virtual ICollection<Event> GeneratedEvents { get; set; } = new List<Event>();
    }
}

