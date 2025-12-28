using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class Itinerary
    {
        [Key]
        public Guid ItineraryId { get; set; } = Guid.NewGuid();

        [ForeignKey("User")]
        public Guid UserId { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; }

        public string Description { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        [StringLength(50)]
        public string TripType { get; set; }

        [StringLength(100)]
        public string DestinationCity { get; set; }

        [StringLength(50)]
        public string DestinationCountry { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? TotalBudget { get; set; }

        [StringLength(3)]
        public string Currency { get; set; } = "USD";

        public bool IsPublic { get; set; } = false;

        public bool IsTemplate { get; set; } = false;

        [StringLength(50)]
        public string TemplateCategory { get; set; }

        [StringLength(20)]
        public string Status { get; set; } = "draft";

        public string ItineraryImageUrl { get; set; } = string.Empty;

		public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.Now;

        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.Now;

        public DateTimeOffset? CompletedAt { get; set; }

        // Navigation Properties
        public virtual User User { get; set; }
        public virtual ICollection<ItineraryItem> ItineraryItems { get; set; } = new List<ItineraryItem>();
        public virtual ICollection<ItineraryShare> ItineraryShares { get; set; } = new List<ItineraryShare>();
    }
}
