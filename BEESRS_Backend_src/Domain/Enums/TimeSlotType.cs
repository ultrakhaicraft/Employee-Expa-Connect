using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Enums
{
	//Used to represent the timeslot of itinerary items, not entirely accurate but good for general planning
	public enum TimeSlotType
	{
		Morning, //5 AM - 12 PM
		Noon, //12 PM - 1 PM
		Afternoon, //1 PM - 4 PM
		Evening, //4 PM - 9 PM
		Night //9 PM - 5 AM
	}
}
