using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.ItineraryDTO
{
	public record ItineraryViewDto
	{
		public Guid ItineraryId { get; set; }
		public Guid UserId { get; set; }
		public string? Title { get; set; }
		public string? Description { get; set; }
		public string? ItineraryImageUrl { get; set; }
		public DateTime StartDate { get; set; }
		public DateTime EndDate { get; set; }
		public string? TripType { get; set; }
		public string? DestinationCity { get; set; }
		public string? DestinationCountry { get; set; }
		public DateTimeOffset CreatedAt { get; set; }
		
	}

	public record ItineraryPagedRequest
	(
		int Page = 1,
		int PageSize = 20,
		string? Title = null,                 // search by Title/Description
		string? TripType = null,               // filter by trip type
		string? DestinationCountry = null     // filter by destination country
		
	);

}
