using Domain.Entities;
using Domain.Enums;
using Infrastructure.Models.ItineraryItemDTO;
using NetTopologySuite.Index.HPRtree;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Helper
{
	public static class ItineraryItemHelper
	{

		/// <summary>
		/// Checks if any itinerary item shares the same NewDayNumber and SortOrder.
		/// SortOrder is now unique only within each NewDayNumber, ignoring TimeSlotType.
		/// </summary>
		/// <param name="allItems">All itinerary items in the itinerary.</param>
		/// <param name="dayNumber">The day number to check within.</param>
		/// <param name="sortOrder">The sort order value to check for duplication.</param>
		/// <param name="currentItemId">Optional: item ID to exclude when updating.</param>
		/// <returns>True if a duplicate SortOrder exists within the same NewDayNumber.</returns>
		public static async Task<bool> IsSortOrderDuplicateAsync(
			List<ItineraryItem> allItems,
			int dayNumber,
			int sortOrder,
			Guid? currentItemId = null)
		{
			await Task.Delay(1000); 

			if (allItems == null || !allItems.Any())
				return false;

			bool isDuplicate;

			if (currentItemId != null)
			{
				// Check for duplicates within the same NewDayNumber, excluding the current item for updates
				isDuplicate = allItems.Any(i =>
					i.DayNumber == dayNumber &&
					i.SortOrder == sortOrder &&
					i.ItemId != currentItemId);
			}
			else
			{
				// Check for duplicates within the same NewDayNumber 
				isDuplicate = allItems.Any(i =>
					i.DayNumber == dayNumber &&
					i.SortOrder == sortOrder);
			}

			return isDuplicate;
		}


		/// <summary>
		/// Checks for internal duplicate SortOrders within the same NewDayNumber 
		/// among the provided list of ItineraryItemCreateDto or ItineraryItemReorderDto.
		/// </summary>
		/// <param name="createRequests">List of ItineraryItemCreateDto requests (optional).</param>
		/// <param name="reorderRequests">List of ItineraryItemReorderDto requests (optional).</param>
		/// <returns>True if there are duplicates of SortOrder within the same NewDayNumber; otherwise false.</returns>
		public static bool HasDuplicateSortOrdersInRequestList(
			List<ItineraryItemCreateDto>? createRequests,
			List<ItineraryItemReorderDto>? reorderRequests)
		{
			//Handle Create DTOs
			if (createRequests != null && createRequests.Any())
			{
				var duplicateGroups = createRequests
					.GroupBy(r => new { r.DayNumber, r.SortOrder })
					.Where(g => g.Count() > 1)
					.ToList();

				if (duplicateGroups.Any())
					return true;
			}

			//Handle Reorder DTOs
			if (reorderRequests != null && reorderRequests.Any())
			{
				var duplicateGroups = reorderRequests
					.GroupBy(r => new { DayNumber = r.NewDayNumber, SortOrder = r.NewSortOrder })
					.Where(g => g.Count() > 1)
					.ToList();

				if (duplicateGroups.Any())
					return true;
			}

			//If no duplicates found in either list
			return false;
		}

		/// <summary>
		/// Check for duplicate time ranges within the provided list, does not check seconds
		/// </summary>
		/// <param name="requests"></param>
		/// <returns></returns>
		public static bool HasDuplicateTimeRanges(List<ItineraryItemCreateDto> createRequest, List<ItineraryItemReorderDto> reorderRequest)
		{

			//Check for overlapping time ranges and duplicate time ranges
			if (createRequest != null && createRequest.Any())
			{
				foreach (var item in createRequest)
				{
					var currentStartTime = item.StartTime;
					var currentEndTime = item.EndTime;
					var currentDayNumber = item.DayNumber;

					foreach (var otherItem in createRequest)
					{

						if (item == otherItem)
							continue;

						// Check for exact duplicate time ranges
						if (currentDayNumber == otherItem.DayNumber &&
							currentStartTime == otherItem.StartTime &&
							currentEndTime == otherItem.EndTime)
						{
							return true;
						}
						// Check for overlapping time ranges
						if (currentDayNumber == otherItem.DayNumber)
						{
							if (currentStartTime < otherItem.EndTime && currentEndTime > otherItem.StartTime)
							{
								return true;
							}
						}
					}
				}
			}

			if (reorderRequest != null && reorderRequest.Any())
			{
				foreach (var item in reorderRequest)
				{
					var currentStartTime = item.StartTime;
					var currentEndTime = item.EndTime;
					var currentDayNumber = item.NewDayNumber;

					foreach (var otherItem in reorderRequest)
					{

						if (item == otherItem)
							continue;

						// Check for exact duplicate time ranges
						if (currentDayNumber == otherItem.NewDayNumber &&
							currentStartTime == otherItem.StartTime &&
							currentEndTime == otherItem.EndTime)
						{
							return true;
						}
						// Check for overlapping time ranges
						if (currentDayNumber == otherItem.NewDayNumber)
						{
							if (currentStartTime < otherItem.EndTime && currentEndTime > otherItem.StartTime)
							{
								return true;
							}
						}
					}
				}
			}

			//No duplicates or overlaps found
			return false;
		}

		/// <summary>
		/// Check if the given time span overlaps with any existing itinerary items on the same day
		/// </summary>
		/// <param name="items"></param>
		/// <param name="dayNumber"></param>
		/// <param name="startTime"></param>
		/// <param name="endTime"></param>
		/// <param name="exisitingStartTime"></param>
		/// <param name="exisitingEndTIme"></param>
		/// <returns></returns>
		public static bool IsTimeSpanOverlapping(
			List<ItineraryItem> items, int dayNumber, TimeSpan startTime, TimeSpan endTime,
			out TimeSpan exisitingStartTime, out TimeSpan exisitingEndTIme)
		{
			exisitingStartTime = default;
			exisitingEndTIme = default;

			if (items == null || items.Count == 0)
				return false;

			//Check for invalid time range (18:00 → 17:00)
			if (endTime <= startTime)
				return false;

			foreach (var item in items)
			{
				//Only compare with items on the same day
				if (item.DayNumber != dayNumber)
					continue;

				if (item.StartTime == null || item.EndTime == null)
					continue;

				//Overlap check: (StartA < EndB) && (EndA > StartB)
				if (startTime < item.EndTime && endTime > item.StartTime)
				{
					exisitingStartTime = item.StartTime.Value;
					exisitingEndTIme = item.EndTime.Value;
					return true;
				}
			}

			return false;
		}


		/// <summary>
		/// Checks if any other item (excluding the one being updated) shares the same NewDayNumber and SortOrder.
		/// SortOrder is now unique only within each NewDayNumber.
		/// </summary>
		/// <param name="allItems">All itinerary items within the itinerary.</param>
		/// <param name="itineraryItemId">The ID of the item being updated (to exclude).</param>
		/// <param name="dayNumber">The day number being checked.</param>
		/// <param name="sortOrder">The sort order value being checked.</param>
		/// <returns>True if a duplicate SortOrder exists within the same NewDayNumber.</returns>
		public static async Task<bool> IsSortOrderDuplicateOnUpdateAsync(
			List<ItineraryItem> allItems,
			Guid itineraryItemId,
			int dayNumber,
			int sortOrder)
		{
			await Task.Delay(1000);

			if (allItems == null || !allItems.Any())
				return false;

			// Check if another item (excluding the current one) shares the same NewDayNumber and SortOrder
			var isDuplicate = allItems.Any(item =>
				item.ItemId != itineraryItemId &&
				item.DayNumber == dayNumber &&
				item.SortOrder == sortOrder);

			return isDuplicate;
		}


		public static bool IsTimeSpanOverlappingOnUpdate(
			List<ItineraryItem> items,
			Guid itineraryItemId,
			int dayNumber,
			TimeSpan startTime,
			TimeSpan endTime,
			out TimeSpan existingStartTime,
			out TimeSpan existingEndTime)
		{
			existingStartTime = default;
			existingEndTime = default;

			if (items == null || items.Count == 0)
				return false;

			
			if (endTime <= startTime)
				return false;

			foreach (var item in items)
			{
				// Skip the current item being updated
				if (item.ItemId == itineraryItemId)
					continue;

				// Compare only within the same day
				if (item.DayNumber != dayNumber)
					continue;

				if (item.StartTime == null || item.EndTime == null)
					continue;

				// Check for overlap
				if (startTime < item.EndTime && endTime > item.StartTime)
				{
					existingStartTime = item.StartTime.Value;
					existingEndTime = item.EndTime.Value;
					return true;
				}
			}

			return false;
		}

		

		public static string GetTimeSlotTypeBasedOnItineraryTimes(TimeSpan startTime, TimeSpan endTime)
		{
			// If end time is past midnight, adjust it for calculation
			if (endTime < startTime)
				endTime = endTime.Add(TimeSpan.FromDays(1));

			//Define  starting point for each time slot
			var morningStart = TimeSpan.FromHours(5);
			var noonStart = TimeSpan.FromHours(12);
			var afternoonStart = TimeSpan.FromHours(13);
			var eveningStart = TimeSpan.FromHours(16);
			var nightStart = TimeSpan.FromHours(21);

			// Get midpoint of the range
			var totalDuration = endTime - startTime;
			var midpoint = startTime + TimeSpan.FromTicks(totalDuration.Ticks / 2);

			// If midpoint go past midnight, wrap around
			if (midpoint.TotalHours >= 24)
				midpoint = midpoint.Subtract(TimeSpan.FromDays(1));

			// Determine which slot midpoint belongs to
			if (midpoint >= morningStart && midpoint < noonStart)
				return TimeSlotType.Morning.ToString();

			if (midpoint >= noonStart && midpoint < afternoonStart)
				return TimeSlotType.Noon.ToString();

			if (midpoint >= afternoonStart && midpoint < eveningStart)
				return TimeSlotType.Afternoon.ToString();

			if (midpoint >= eveningStart && midpoint < nightStart)
				return TimeSlotType.Evening.ToString();

			// Night covers 9 PM → 5 AM
			return TimeSlotType.Night.ToString();
		}


		public static bool IsItemSortByTimeCorrect(
			List<ItineraryItem> items, ItineraryItem newItem)
		{

			var tempList = new List<ItineraryItem>(items);

			// Check if the new item already exists in DB, if yes, replace it
			var index = tempList.FindIndex(i => i.ItemId == newItem.ItemId);
			if (index >= 0)
				tempList[index] = newItem;
			else
				tempList.Add(newItem);

			var sortedBySortOrder = tempList
				.OrderBy(i => i.DayNumber)
				.ThenBy(i => i.SortOrder)
				.ToList();

			// Validate chronological order within each day
			for (int i = 0; i < sortedBySortOrder.Count - 1; i++)
			{
				var current = sortedBySortOrder[i];
				var next = sortedBySortOrder[i + 1];


				if (current.DayNumber == next.DayNumber)
				{
					
					if (current.EndTime > next.StartTime)
						return false;

					
					if (current.StartTime > next.StartTime)
						return false;
				}
			}

			return true; 
		}

		public static bool IsItemListSortByTimeCorrect(
			List<ItineraryItem> existingItems, List<ItineraryItem> newItems)
		{
			var tempList = new List<ItineraryItem>(existingItems);

			// Check if the new item already exists in DB, if yes, replace it (Update scenario because self comparsion isn't needed)
			foreach (var newItem in newItems)
			{
				var index = tempList.FindIndex(i => i.ItemId == newItem.ItemId);
				if (index >= 0)
					tempList[index] = newItem; 
				else
					tempList.Add(newItem);
			}

			var combined = tempList
				.Concat(newItems)
				.OrderBy(i => i.DayNumber)
				.ThenBy(i => i.SortOrder)
				.ToList();

			
			for (int i = 0; i < combined.Count - 1; i++)
			{
				var current = combined[i];
				var next = combined[i + 1];

				
				if (current.DayNumber == next.DayNumber)
				{
					if (current.EndTime > next.StartTime)
						return false;

					if (current.StartTime > next.StartTime)
						return false;
				}
			}

			return true; 
		}

	}
}
