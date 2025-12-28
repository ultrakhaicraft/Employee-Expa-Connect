using Domain.Enums;
using Infrastructure.Models.ItineraryItemDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.ItineraryDTO
{
	public class ItineraryDayScheduleDto
	{
		public int DayNumber { get; set; } // Day 1, Day 2, etc.
		public List<ItineraryTimeGroupDto> TimeGroups { get; set; } = new List<ItineraryTimeGroupDto>();
	}

	public class ItineraryTimeGroupDto
	{
		public required string TimeSlot { get; set; } // Morning, Noon, Afternoon, Evening, Night, use TimeSlotType enum
		public List<ItineraryItemDetailDto> Activities { get; set; } = new List<ItineraryItemDetailDto>();
	}
}
