using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.ItineraryStatisticsDTO
{
	//Statistics related to the user in the context of itineraries
	public record UserItineraryStatDto
	{
		public int ItnerariesCreated { get; set; } //Number of itineraries in general (including template) created by the user
		public int TemplatesCreated { get; set; } //Number of templates created by the user
		public int ItinerariesCompleted { get; set; } //Number of itineraries completed by the user
		public int ItinerariesShared { get; set; } //Number of itineraries shared by the user, based on amount of Itinerary Share
	}
}
