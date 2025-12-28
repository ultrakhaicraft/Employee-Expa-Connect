using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.ItineraryDTO
{
	public record ItineraryTemplateDto
	{
		public Guid ItineraryId { get; set; }
		public string? Title { get; set; }
		public string? Description { get; set; }
		public string? TripType { get; set; }
		public string? TemplateCategory { get; set; }
		public string? DestinationCity { get; set; }
		public string? DestinationCountry { get; set; }
		public decimal? TotalBudget { get; set; }
		public string? Currency { get; set; }
		public bool IsPublic { get; set; }
		public bool IsTemplate { get; set; }
		public DateTime StartDate { get; set; }
		public DateTime EndDate { get; set; }
		public DateTimeOffset CreatedAt { get; set; }

	}

}
