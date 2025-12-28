using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.ItineraryItemDTO
{
	public class ItineraryItemDetailDto
	{
		
		public Guid ItemId { get; set; } 
		public Guid ItineraryId { get; set; }		
		public Guid? PlaceId { get; set; }		
		public int DayNumber { get; set; }
		public TimeSpan? StartTime { get; set; }
		public TimeSpan? EndTime { get; set; }
		public int? ActualDuration { get; set; }
		public int? EstimatedDuration { get; set; }
		public string? ActivityTitle { get; set; }
		public string? ActivityDescription { get; set; }
		public string? ActivityType { get; set; }
		public decimal? EstimatedCost { get; set; }
		public decimal? ActualCost { get; set; }
		public string? BookingReference { get; set; }
		public string? BookingStatus { get; set; }
		public string? TransportMethod { get; set; }
		public int? TransportDuration { get; set; }
		public decimal? TransportCost { get; set; }
		public bool IsCompleted { get; set; }
		public string? CompletionNotes { get; set; }
		public int SortOrder { get; set; }
		public DateTimeOffset CreatedAt { get; set; } 
		public DateTimeOffset UpdatedAt { get; set; } 
	}
}
