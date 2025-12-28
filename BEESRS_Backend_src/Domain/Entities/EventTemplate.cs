using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    public class EventTemplate
    {
        [Key]
        public Guid TemplateId { get; set; } = Guid.NewGuid();

        [ForeignKey("CreatedByUser")]
        public Guid CreatedBy { get; set; }

        [Required]
        [StringLength(200)]
        public string TemplateName { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; }

        public string? EventDescription { get; set; }

        [Required]
        [StringLength(50)]
        public string EventType { get; set; }

        public int? EstimatedDuration { get; set; }

        public int ExpectedAttendees { get; set; }

        public int? MaxAttendees { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? BudgetTotal { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? BudgetPerPerson { get; set; }

        [StringLength(50)]
        public string? Timezone { get; set; } = "UTC";

        // Template settings
        public bool IsPublic { get; set; } = false; // Public templates can be used by anyone
        public bool IsDefault { get; set; } = false; // Default templates shown first
        public int UsageCount { get; set; } = 0; // How many times this template has been used

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation Properties
        public virtual User CreatedByUser { get; set; }
    }
}

