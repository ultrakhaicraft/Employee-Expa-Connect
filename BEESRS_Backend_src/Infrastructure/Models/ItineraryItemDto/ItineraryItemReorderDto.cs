using Infrastructure.Helper;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.ItineraryItemDTO
{
	[ValidTimeRange(nameof(StartTime), nameof(EndTime))]
	public record ItineraryItemReorderDto
	{
		[Required(ErrorMessage = "Itinerary Item Id is required")]
		public Guid ItemId { get; set; }

		[Required(ErrorMessage = "Sort Order is required")]
		public int NewSortOrder { get; set; } 
		[Range(1, 30, ErrorMessage = "Day Number must be between 1 and 30, can't exceed more than 30 days")]
		[Required(ErrorMessage = "Day Number is required")]
		public int NewDayNumber { get; set; } 

		[Required(ErrorMessage = "Start time is required.")]
		public TimeSpan? StartTime { get; set; } 

		[Required(ErrorMessage = "End time is required.")]
		public TimeSpan? EndTime { get; set; } 
	}
}
