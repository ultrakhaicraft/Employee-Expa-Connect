using Domain.Enums;
using NetTopologySuite.Geometries;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class Place
    {
        [Key]
        public Guid PlaceId { get; set; } = Guid.NewGuid();

        [StringLength(255)]
        public string? GooglePlaceId { get; set; }

        [Required]
        [StringLength(200)]
        public string Name { get; set; }

        public string Description { get; set; }

        [ForeignKey("PlaceCategory")]
        public int? CategoryId { get; set; }

        [Required]
        [Column(TypeName = "float(53)")]
        public double Latitude { get; set; }

        [Required]
        [Column(TypeName = "float(53)")]
        public double Longitude { get; set; }

        [StringLength(200)]
        public string AddressLine1 { get; set; }

		[JsonIgnore] // Prevents infinite recursion  while optimize route entirely
		[Column(TypeName = "geography")]
        public Point GeoLocation { get; set; }

        public TimeSpan? OpenTime { get; set; }

        public TimeSpan? CloseTime { get; set; }
        public bool IsDeleted { get; set; } = false;

        [StringLength(100)]
        public string City { get; set; }

        [StringLength(100)]
        public string StateProvince { get; set; }

        [StringLength(20)]
        public string? PhoneNumber { get; set; }

        public string? WebsiteUrl { get; set; }

        [StringLength(100)]
        public string? Email { get; set; }

        [StringLength(100)]
        public string? BestTimeToVisit { get; set; }

        [StringLength(100)]
        public string? BusyTime { get; set; }

        public string? SuitableFor { get; set; }

        [Range(1, 5)]
        public int? PriceLevel { get; set; }

        [Column(TypeName = "decimal(3,2)")]
        public decimal AverageRating { get; set; } = 0.00m;

        public int TotalReviews { get; set; } = 0;
        public int TotalLikes { get; set; } = 0;

        [Column(TypeName = "decimal(3,2)")]
        public decimal? AiCategoryConfidence { get; set; }

        public string? AiSuggestedTags { get; set; } // JSON

        public string? AiPriceEstimate { get; set; } // JSON

        [ForeignKey("Branch")]
        public Guid BranchId { get; set; }

        public PlaceVerificationStatus VerificationStatus { get; set; } = PlaceVerificationStatus.Pending;
        public string? VerificationNotes { get; set; }

        [ForeignKey("CreatedByUser")]
        public Guid? CreatedBy { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        public DateTimeOffset? VerifiedAt { get; set; }

        // Navigation Properties
        public virtual Branch Branch { get; set; }
        public virtual PlaceCategory PlaceCategory { get; set; }
        public virtual User CreatedByUser { get; set; }
        // virtual ICollection<PlaceHour> PlaceHours { get; set; } = new List<PlaceHour>();
        public virtual ICollection<PlaceImage> PlaceImages { get; set; } = new List<PlaceImage>();
        public virtual ICollection<PlaceTagAssignment> PlaceTagAssignments { get; set; } = new List<PlaceTagAssignment>();
        public virtual ICollection<PlaceReview> PlaceReviews { get; set; } = new List<PlaceReview>();
        public virtual ICollection<SavedPlace> SavedPlaces { get; set; } = new List<SavedPlace>();
        public virtual ICollection<EventPlaceOption> EventPlaceOptions { get; set; } = new List<EventPlaceOption>();
        public virtual ICollection<ItineraryItem> ItineraryItems { get; set; } = new List<ItineraryItem>();
        public virtual ICollection<PlaceVote> PlaceVotes { get; set; } = new List<PlaceVote>();
        public virtual ICollection<PlaceReport> PlaceReports { get; set; } = new List<PlaceReport>();
    }
}
