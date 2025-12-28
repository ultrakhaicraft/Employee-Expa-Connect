using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class EventPlaceOption
    {
        [Key]
        public Guid OptionId { get; set; } = Guid.NewGuid();

        [ForeignKey("Event")]
        public Guid EventId { get; set; }

        [ForeignKey("Place")]
        public Guid? PlaceId { get; set; } // ✅ Nullable - can be null for external providers (AI now uses 100% system places)

        [StringLength(20)]
        public string SuggestedBy { get; set; } = "ai";

        [Column(TypeName = "decimal(4,2)")]
        public decimal? AiScore { get; set; }

        public string AiReasoning { get; set; } // JSON

        public string Pros { get; set; } // JSON

        public string Cons { get; set; } // JSON

        [Column(TypeName = "decimal(8,2)")]
        public decimal? EstimatedCostPerPerson { get; set; }

        public bool AvailabilityConfirmed { get; set; } = false;

        public DateTimeOffset AddedAt { get; set; } = DateTimeOffset.Now;

        // ✅ External Provider Support (for external providers like TrackAsia, Google Maps, etc.)
        // Note: AI Recommendation service now uses 100% system places only
        // These fields are kept for backward compatibility and manual place additions
        [StringLength(50)]
        public string? ExternalProvider { get; set; } // e.g., "TrackAsia", "GoogleMaps"

        [StringLength(255)]
        public string? ExternalPlaceId { get; set; } // External provider place_id

        [StringLength(200)]
        public string? ExternalPlaceName { get; set; }

        [StringLength(500)]
        public string? ExternalAddress { get; set; }

        [Column(TypeName = "float(53)")]
        public double? ExternalLatitude { get; set; }

        [Column(TypeName = "float(53)")]
        public double? ExternalLongitude { get; set; }

        [Column(TypeName = "decimal(3,2)")]
        public decimal? ExternalRating { get; set; }

        public int? ExternalTotalReviews { get; set; }

        [StringLength(20)]
        public string? ExternalPhoneNumber { get; set; }

        [StringLength(500)]
        public string? ExternalWebsite { get; set; }

        [StringLength(1000)]
        public string? ExternalPhotoUrl { get; set; } // Main photo URL

        [StringLength(100)]
        public string? ExternalCategory { get; set; }

        // Navigation Properties
        public virtual Event Event { get; set; }
        public virtual Place Place { get; set; } // ✅ Can be null for external suggestions (AI now uses 100% system places)
        public virtual ICollection<EventVote> EventVotes { get; set; } = new List<EventVote>();
    }
}
