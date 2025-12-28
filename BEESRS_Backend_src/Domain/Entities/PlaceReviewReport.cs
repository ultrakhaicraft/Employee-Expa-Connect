using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class PlaceReviewReport
    {
        [Key]
        public Guid ReportId { get; set; } = Guid.NewGuid();

        [ForeignKey("PlaceReview")]
        public Guid ReviewId { get; set; }

        [ForeignKey("User")]
        public Guid ReportedByUserId { get; set; }

        [Required]
        [StringLength(300)]
        public string Reason { get; set; }

        public DateTimeOffset ReportedAt { get; set; } = DateTimeOffset.UtcNow;

        public bool IsResolved { get; set; } = false;

        [ForeignKey("ResolvedByUser")]
        public Guid? ResolvedByUserId { get; set; }

        public DateTimeOffset? ResolvedAt { get; set; }

        // Navigation
        public virtual PlaceReview PlaceReview { get; set; }
        public virtual User ReportedByUser { get; set; }
        public virtual User ResolvedByUser { get; set; }
    }
}
