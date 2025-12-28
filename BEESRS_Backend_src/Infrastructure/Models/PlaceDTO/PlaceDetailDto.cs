using Infrastructure.Models.PlaceReview;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.PlaceDTO
{
	public record PlaceDetailDto
	{
		public Guid PlaceId { get; set; }
		public string GooglePlaceId { get; set; } = string.Empty;
		public string Name { get; set; } = string.Empty;
		public string Description { get; set; } = string.Empty;
		public int? CategoryId { get; set; }
		public decimal Latitude { get; set; }
		public decimal Longitude { get; set; }
		public string AddressLine1 { get; set; } = string.Empty;
		public string City { get; set; } = string.Empty;
		public string StateProvince { get; set; } = string.Empty;
		public string PhoneNumber { get; set; } = string.Empty;
		public string WebsiteUrl { get; set; } = string.Empty;
		public string Email { get; set; } = string.Empty;
        public string? BestTimeToVisit { get; set; }
        public string? BusyTime { get; set; }
        public string? SuitableFor { get; set; }
        public int? PriceLevel { get; set; }
		public decimal AverageRating { get; set; } 
		public int TotalReviews { get; set; } 
		public string VerificationStatus { get; set; } = string.Empty;
		public Guid? CreatedBy { get; set; }
		public DateTimeOffset CreatedAt { get; set; } 
		public DateTimeOffset UpdatedAt { get; set; } 
		public DateTimeOffset? VerifiedAt { get; set; }
	}

    public record PlaceDetailForHome
    {
        public Guid PlaceId { get; set; }
        public string? GooglePlaceId { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public int? CategoryId { get; set; }
        public string? CategoryName { get; set; }	// from PlaceCategory
        public string AddressLine1 { get; set; }
        public TimeSpan? OpenTime { get; set; }

        public TimeSpan? CloseTime { get; set; }
        public string City { get; set; }
        public string StateProvince { get; set; }
        public string PhoneNumber { get; set; }
        public string WebsiteUrl { get; set; }
        public string Email { get; set; }
        public string? BestTimeToVisit { get; set; }
        public string? BusyTime { get; set; }
        public string? SuitableFor { get; set; }
        public int? PriceLevel { get; set; }
        public decimal AverageRating { get; set; } = 0.00m;

        public int TotalReviews { get; set; } = 0;
        public int TotalLikes { get; set; } = 0;
        public decimal? AiCategoryConfidence { get; set; }

        public string AiSuggestedTags { get; set; } // JSON

        public string AiPriceEstimate { get; set; } // JSON
        public string VerificationStatus { get; set; } = "pending";
        public Guid? CreatedByUserId { get; set; }
        public string? CreatedBy { get; set; }	// from CreatedByUser
        public string? CreatedByAvatar { get; set; }

        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
        public DateTimeOffset? VerifiedAt { get; set; }
        public DateTimeOffset? LastReviewedAt { get; set; }

        public List<PlaceImageDTO> ImageUrls { get; set; } = new List<PlaceImageDTO>();
    }
    public record PlaceDetail : PlaceDetailForHome
    {
        public bool IsSavedByCurrentUser { get; set; } = false;
        public bool IsLikedByCurrentUser { get; set; } = false;
    }

    public record PlaceWithReviews
    {
        public PlaceDetail PlaceDetail { get; set; }
        public List<ReviewDetailForUser> Reviews { get; set; } = new List<ReviewDetailForUser>();
    }
}
