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
    public class ItineraryItem
    {
        [Key]
        public Guid ItemId { get; set; } = Guid.NewGuid();

        [ForeignKey("Itinerary")]
        public Guid ItineraryId { get; set; }

        [ForeignKey("Place")]
        public Guid? PlaceId { get; set; }

        [Required]
        public int DayNumber { get; set; } //Can't be more than 30 days 

		[Required(ErrorMessage = "Start time is required.")]
		public TimeSpan? StartTime { get; set; }
		[Required(ErrorMessage = "End time is required.")]
		public TimeSpan? EndTime { get; set; }

        [Required]
        public string? TimeSlotType { get; set; } // Morning, Noon, Afternoon, Evening, Night, use TimeSlotType enum
		public int? EstimatedDuration { get; set; } // in seconds, with minimum unit of 30 minutes
		public int? ActualDuration { get; set; } // in seconds, with minimum unit of 30 minutes

		[Required]
        [StringLength(200)]
        public string ActivityTitle { get; set; }

        public string ActivityDescription { get; set; }

        [StringLength(50)]
        public string ActivityType { get; set; }

        [Column(TypeName = "decimal(8,2)")]
        public decimal? EstimatedCost { get; set; }

        [Column(TypeName = "decimal(8,2)")]
        public decimal? ActualCost { get; set; }

        [StringLength(100)]
        public string BookingReference { get; set; }

        [StringLength(20)]
        public string BookingStatus { get; set; }

        [StringLength(50)]
        public string TransportMethod { get; set; }

        public int? TransportDuration { get; set; }

        [Column(TypeName = "decimal(8,2)")]
        public decimal? TransportCost { get; set; }

        public bool IsCompleted { get; set; } = false;

        public string CompletionNotes { get; set; }

        public int SortOrder { get; set; } = 0;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.Now;

        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.Now;

        // Navigation Properties
        public virtual Itinerary Itinerary { get; set; }
        public virtual Place Place { get; set; }
    }
}
