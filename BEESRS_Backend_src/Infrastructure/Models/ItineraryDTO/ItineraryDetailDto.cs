using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.ItineraryDTO
{
	public record ItineraryDetailDto
	{
		
		public Guid ItineraryId { get; set; } 
		public Guid UserId { get; set; }		
		public string? Title { get; set; }
		public string? Description { get; set; }
		public DateTime StartDate { get; set; }		
		public DateTime EndDate { get; set; }	
		public string? TripType { get; set; }		
		public string? DestinationCity { get; set; }		
		public string? DestinationCountry { get; set; }		
		public decimal? TotalBudget { get; set; }
		public string? Currency { get; set; } 
		public bool IsPublic { get; set; } 
		public bool IsTemplate { get; set; }
		public string? TemplateCategory { get; set; }
		public string? Status { get; set; }
		public string? ItineraryImageUrl { get; set; }
		public DateTimeOffset CreatedAt { get; set; }
		public DateTimeOffset UpdatedAt { get; set; } 
		public DateTimeOffset? CompletedAt { get; set; }
		public decimal? TotalEstimateCost { get; set; } = 0;  //TransportCost + EstimateCost of all Itinerary Items
		public decimal? TotalActualCost { get; set; } = 0; //TransportCost + ActualCost of all Itinerary Items
		public List<ItineraryDayScheduleDto> ItineraryItems { get; set; } = new List<ItineraryDayScheduleDto>();
	}
}
