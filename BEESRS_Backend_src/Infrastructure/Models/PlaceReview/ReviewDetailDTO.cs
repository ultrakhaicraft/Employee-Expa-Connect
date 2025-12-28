using Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.PlaceReview
{
    public record ReviewDetailDTO
    {
        public Guid ReviewId { get; set; }
        public Guid PlaceId { get; set; }
        public string Name { get; set; }    // place name

        // Creator info
        public Guid UserId { get; set; }
        public string FullName { get; set; }
        public string? ProfilePictureUrl { get; set; }
 
        public string ReviewText { get; set; }

        public int OverallRating { get; set; }
        public int? FoodQualityRating { get; set; }
        public int? ServiceRating { get; set; }
        public int? AtmosphereRating { get; set; }
        public int? PriceLevelRating { get; set; }

        public int HelpfulVotes { get; set; }
        public DateTime? VisitDate { get; set; }
        public string? VisitType { get; set; }

        public bool IsFlagged { get; set; }
        public string ModerationStatus { get; set; }
        public string? ModerationReason { get; set; }

        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }

        public List<string> ReviewImageUrls { get; set; } = new List<string>();
    }

    public record ReviewDetailForUser : ReviewDetailDTO
    {
        public bool IsReviewByCurrentUser { get; set; }
        public bool isHelpfulByCurrentUser { get; set; }
    }
}
