using Domain.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class PlaceReview
    {
        [Key]
        public Guid ReviewId { get; set; } = Guid.NewGuid();

        [ForeignKey("Place")]
        public Guid PlaceId { get; set; }

        [ForeignKey("User")]
        public Guid UserId { get; set; }

        [Required]
        [Range(1, 5)]
        public int OverallRating { get; set; }

        [Range(1, 5)]
        public int? FoodQualityRating { get; set; }

        [Range(1, 5)]
        public int? ServiceRating { get; set; }

        [Range(1, 5)]
        public int? AtmosphereRating { get; set; }

        [Range(1, 5)]
        public int PriceLevelRating { get; set; }

        [Required]
        [MinLength(20)]
        public string ReviewText { get; set; }

        public DateTime? VisitDate { get; set; }

        [StringLength(50)]
        public string VisitType { get; set; }

        public bool IsFlagged { get; set; } = false;
        public ReviewStatus ModerationStatus { get; set; } = ReviewStatus.Pending;

        [StringLength(300)]
        public string? ModerationReason { get; set; }

        [ForeignKey("ModeratedByUser")]
        public Guid? ModeratedBy { get; set; }

        public DateTimeOffset? ModeratedAt { get; set; }

        public int HelpfulVotes { get; set; } = 0;

        public int NotHelpfulVotes { get; set; } = 0;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation Properties
        public virtual Place Place { get; set; }
        public virtual User User { get; set; }
        public virtual User ModeratedByUser { get; set; }
        public virtual ICollection<ReviewImage> ReviewImages { get; set; } = new List<ReviewImage>();
        public virtual ICollection<ReviewVote> ReviewVotes { get; set; } = new List<ReviewVote>();
        public virtual ICollection<PlaceReviewReport> ReviewReports { get; set; } = new List<PlaceReviewReport>();

    }
}
