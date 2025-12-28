using AutoMapper;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Models.ItineraryDTO;
using Infrastructure.Models.ItineraryItemDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Helper
{
	public static class ItineraryHelper
	{
		
		public static List<ItineraryDayScheduleDto> ConvertListOfItineraryItemsToItineraryDayScheduleDto
			(List<ItineraryItem> itineraryItems, IMapper _mapper)
		{
			var DaySchedule = new List<ItineraryDayScheduleDto>();

			// Group by NewDayNumber
			var dayGroups = itineraryItems
				.GroupBy(i => i.DayNumber)
				.OrderBy(g => g.Key);

			foreach (var dayGroup in dayGroups)
			{
				var daySchedule = new ItineraryDayScheduleDto
				{
					DayNumber = dayGroup.Key
				};

				// Group by TimeSlotType within each day
				var activityTypeGroups = dayGroup
					.GroupBy(i => i.TimeSlotType ?? "Other")
					.OrderBy(g => GetTimeSlotTypeOrder(g.Key)); // custom order by enum

				foreach (var typeGroup in activityTypeGroups)
				{
					var timeGroup = new ItineraryTimeGroupDto
					{
						TimeSlot = typeGroup.Key,
						Activities = typeGroup
							.Select(i => _mapper.Map<ItineraryItemDetailDto>(i))
							.OrderBy(i => i.SortOrder) // sort by SortOrder AFTER TimeSlotType
							.ThenBy(i => i.StartTime) //Optional
							.ToList()
					};

					daySchedule.TimeGroups.Add(timeGroup);
				}

				DaySchedule.Add(daySchedule);
			}


			return DaySchedule;
		}

		public static void CalculateItineraryCosts(ItineraryDetailDto itinerary)
		{
			if (itinerary == null) return;

			decimal totalEstimated = 0;
			decimal totalActual = 0;

			foreach (var day in itinerary.ItineraryItems)
			{
				foreach (var timeGroup in day.TimeGroups)
				{
					foreach (var item in timeGroup.Activities)
					{
						// Estimated Cost = EstimatedCost + TransportCost
						var estimated = (item.EstimatedCost ?? 0) + (item.TransportCost ?? 0);
						totalEstimated += estimated;

						// Actual Cost = ActualCost + TransportCost
						var actual = (item.ActualCost ?? 0) + (item.TransportCost ?? 0);
						totalActual += actual;
					}
				}
			}

			itinerary.TotalEstimateCost = totalEstimated;
			itinerary.TotalActualCost = totalActual;
		}


		public static int GetTimeSlotTypeOrder(string timeSlotType)
		{
			if (System.Enum.TryParse<TimeSlotType>(timeSlotType, true, out var type))
				return (int)type;

			// Default unknown types to the end
			return int.MaxValue;
		}

		public static bool IsAnyItineraryItemAffectedByDayChange(List<ItineraryItem> itineraryItems, DateTime startDate, DateTime endDate)
		{
			if(itineraryItems==null || itineraryItems.Count==0)
			{
				return false; // No items to be affected.
			}

			//Calculate total days between start date and end date.
			int totalDays = (endDate - startDate).Days + 1;

			//Check if there is any itinerary item with DayNumber greater than totalDays.
			//Return true if there is any such item, else false.
			bool result = itineraryItems.Any(item => item.DayNumber > totalDays);


			return result; // No items affected by the day change.
		}
	}
}
