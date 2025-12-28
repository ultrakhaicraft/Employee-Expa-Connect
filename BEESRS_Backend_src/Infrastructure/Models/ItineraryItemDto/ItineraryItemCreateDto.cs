using Infrastructure.Helper;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.ItineraryItemDTO
{
	[ValidTimeRange(nameof(StartTime), nameof(EndTime))]
	public class ItineraryItemCreateDto
	{
		[Required]
		public Guid? PlaceId { get; set; }

		[Required(ErrorMessage = "Day Number is required")]
		[Range(1, 30, ErrorMessage = "Day Number must be between 1 and 30, can't exceed more than 30 days")]
		public int DayNumber { get; set; } // Only 30 Day allowed

		[Required(ErrorMessage = "Start time is required.")]
		public TimeSpan? StartTime { get; set; }

		[Required(ErrorMessage = "End time is required.")]
		public TimeSpan? EndTime { get; set; }

		[Required(ErrorMessage = "Activity Title is required")]
		[StringLength(200)]
		public string ActivityTitle { get; set; } = string.Empty;
		[Required(ErrorMessage = "Activity Description is required")]
		public string ActivityDescription { get; set; } = string.Empty;
		[Required(ErrorMessage = "Activity Type is required")]
		[StringLength(50)]
		public string ActivityType { get; set; } = string.Empty;
		[Column(TypeName = "decimal(8,2)")]
		public decimal? EstimatedCost { get; set; }
		[Column(TypeName = "decimal(8,2)")]
		public decimal? ActualCost { get; set; }
		public int? EstimatedDuration { get; set; } // in seconds, with minimum unit of 30 minutes
		public int? ActualDuration { get; set; } // in seconds, with minimum unit of 30 minutes

		[StringLength(100)]
		public string? BookingReference { get; set; }
		[StringLength(20)]
		public string? BookingStatus { get; set; }
		[StringLength(50)]
		public string? TransportMethod { get; set; }
		[Column(TypeName = "decimal(8,2)")]
		public decimal? TransportCost { get; set; }
		public bool IsCompleted { get; set; }
		public string? CompletionNotes { get; set; }

		[Required(ErrorMessage = "Sort Order is required")]
		public int SortOrder { get; set; } //Relative to NewDayNumber, reset for every new day
	}
}
