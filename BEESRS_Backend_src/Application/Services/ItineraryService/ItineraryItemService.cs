using Application.Helper;
using Application.Interfaces;
using Application.Interfaces.ItineraryService;
using Application.Interfaces.ThirdParty;
using AutoMapper;
using Azure.Core;
using Domain.Entities;
using Domain.Enums;
using Domain.Enums.NotificationActionType;
using Infrastructure.Configurations;
using Infrastructure.Helper;
using Infrastructure.Helper.Enum;
using Infrastructure.Interfaces;
using Infrastructure.Interfaces.IPlaceRepos;
using Infrastructure.Interfaces.Personal_Itinerary;
using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using Infrastructure.Models.ItineraryItemDTO;
using Infrastructure.Models.NotificationDTO;
using Infrastructure.Models.RouteCalculationDTO;
using MediatR;
using Microsoft.Extensions.Logging;
using NetTopologySuite.Index.HPRtree;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using static QuestPDF.Helpers.Colors;

namespace Application.Services.ItineraryService
{
	public class ItineraryItemService : IItineraryItemService
	{
		private readonly IItineraryRepository _itineraryRepository;
		private readonly IItineraryItemRepository _itineraryItemRepository;
		private readonly ITrackAsiaService _routeCalculator; 
		private readonly IUnitOfWork _unitOfWork;
		private readonly IMapper _mapper;
		private readonly ILogger<ItineraryService> _logger;

		public ItineraryItemService(
			IItineraryRepository itineraryRepository,
			IItineraryItemRepository itineraryItemRepository,
			ITrackAsiaService routeCalculator,
			IUnitOfWork unitOfWork,
			IMapper mapper,
			ILogger<ItineraryService> logger)
		{
			_itineraryRepository = itineraryRepository;
			_itineraryItemRepository = itineraryItemRepository;
			_routeCalculator = routeCalculator;
			_unitOfWork = unitOfWork;
			_mapper = mapper;
			_logger = logger;
		}

		public async Task<ApiResponse<ItineraryItemDetailDto>> AddItineraryItemAsync(Guid itineraryId, ItineraryItemCreateDto request)
		{
			await _unitOfWork.BeginTransactionAsync();
			try
			{
				var itinerary = await _itineraryRepository.GetByIdAsync(itineraryId);
				if (itinerary == null)
					return ApiResponse<ItineraryItemDetailDto>.ErrorResultWithCode("Itinerary not found", (int)ResponseCode.NotFound);

				//Check for Start Time and End Time overlap 
				var allItems = await _itineraryItemRepository.GetAllByItineraryIdAsync(itineraryId);

				if (ItineraryItemHelper.IsTimeSpanOverlapping(allItems, request.DayNumber, request.StartTime.Value, request.EndTime.Value,
					out TimeSpan exisitingStartTime, out TimeSpan exisitingEndTIme))
				{
					return ApiResponse<ItineraryItemDetailDto>.ErrorResultWithCode(
						$"Time conflict detected: {request.StartTime.Value} to {request.EndTime.Value}" +
						$"overlaps with another itinerary item time {exisitingStartTime} to {exisitingEndTIme} " +
						$"on Day {request.DayNumber}.",
						(int)ResponseCode.BadRequest);
				}

				//Check for duplicate SortOrder within same Day & TimeSlot

				string TimeSlot = ItineraryItemHelper.GetTimeSlotTypeBasedOnItineraryTimes(request.StartTime.Value, request.EndTime.Value);

				var isDuplicate = await ItineraryItemHelper.IsSortOrderDuplicateAsync(allItems, request.DayNumber, request.SortOrder, null);

				if (isDuplicate)
				{
					return ApiResponse<ItineraryItemDetailDto>.ErrorResultWithCode(
						$"There already an Itinerary Item in Order {request.SortOrder} for Day {request.DayNumber} at {TimeSlot} Activity, " +
								$"please select other time slot",
						(int)ResponseCode.BadRequest);
				}

				var item = _mapper.Map<ItineraryItem>(request);
				item.TimeSlotType = TimeSlot;
				item.ItineraryId = itineraryId;
				item.CreatedAt = DateTimeOffset.UtcNow;
				item.UpdatedAt = DateTimeOffset.UtcNow;

				//Check for Item Sort by Time correctness
				var isSortByTimeCorrect = ItineraryItemHelper.IsItemSortByTimeCorrect(allItems, item);

				if (!isSortByTimeCorrect)
				{
					return ApiResponse<ItineraryItemDetailDto>.ErrorResultWithCode(
						$"The Itinerary Item's Start Time and End Time are not in correct order based on the existing Itinerary Items. " +
						$"Please ensure the times are sequentially ordered within the day.",
						(int)ResponseCode.BadRequest);
				}

				await _itineraryItemRepository.CreateSingleAsync(item);

				//Calculate Transport Duration from the Itinerary Items before this (newly added) Itinerary Items
				await CalculateDurationOfItineraryItems(itineraryId: itineraryId, trackedItem: item);

		
				await _unitOfWork.CommitAsync();

				var result = _mapper.Map<ItineraryItemDetailDto>(item);

				return ApiResponse<ItineraryItemDetailDto>.SuccessResult(result, "Itinerary item added successfully");
			}
			catch (Exception) 
			{
				await _unitOfWork.RollbackAsync();
				throw;
			}

		}


		public async Task<ApiResponse<bool>> AddItineraryItemsBatchAsync(Guid itineraryId, List<ItineraryItemCreateDto> requests)
		{
			await _unitOfWork.BeginTransactionAsync();
			try
			{
				var itinerary = await _itineraryRepository.GetByIdAsync(itineraryId);
				if (itinerary == null)
					return ApiResponse<bool>.ErrorResultWithCode("Itinerary not found", (int)ResponseCode.NotFound);

				// Validate for duplicates in the list before inserting
				bool hasDuplicates = ItineraryItemHelper.HasDuplicateSortOrdersInRequestList(reorderRequests: null, createRequests: requests);

				if (hasDuplicates)
				{
					return ApiResponse<bool>.ErrorResultWithCode(
						"There are itinerary items share the same order detected within the request list. " +
						"Each NewDayNumber must have unique SortOrders to avoid conflict.",
						(int)ResponseCode.BadRequest
					);
				}

				if (ItineraryItemHelper.HasDuplicateTimeRanges(createRequest: requests, reorderRequest: null))
				{
					return ApiResponse<bool>.ErrorResultWithCode(
						"There are itinerary items share the same time range detected within the request list. " +
						"Each NewDayNumber must have unique time ranges to avoid conflict.",
						(int)ResponseCode.BadRequest
					);
				}

				// Get all items in the same itinerary
				var allItems = await _itineraryItemRepository.GetAllByItineraryIdAsync(itineraryId);



				foreach (var req in requests)
				{
					//Check for Start Time and End Time overlap 

					if (ItineraryItemHelper.IsTimeSpanOverlapping(allItems, req.DayNumber, req.StartTime.Value, req.EndTime.Value,
					out TimeSpan exisitingStartTime, out TimeSpan exisitingEndTIme))
					{
						return ApiResponse<bool>.ErrorResultWithCode(
							$"Time conflict detected: {req.StartTime.Value} to {req.EndTime.Value} " +
							$"overlaps with another itinerary item time {exisitingStartTime} to {exisitingEndTIme} " +
							$"on Day {req.DayNumber}.",
							(int)ResponseCode.BadRequest);
					}

					//Check for duplicate SortOrder within same Day & Timeslot

					string timeSlot = ItineraryItemHelper.GetTimeSlotTypeBasedOnItineraryTimes(req.StartTime.Value, req.EndTime.Value);

					bool isDuplicate = await ItineraryItemHelper.IsSortOrderDuplicateAsync(allItems, req.DayNumber,
						req.SortOrder, null);

					if (isDuplicate)
					{
						return ApiResponse<bool>.ErrorResultWithCode(
							$"There already an Itinerary Item in Order {req.SortOrder} for Day {req.DayNumber} at {timeSlot} Activity, " +
								$"please select other time slot",
							(int)ResponseCode.BadRequest);
					}


				}

				// Map DTOs to entity list
				var items = requests.Select(r =>
				{
					string timeSlot = ItineraryItemHelper.GetTimeSlotTypeBasedOnItineraryTimes(r.StartTime.Value, r.EndTime.Value);
					var entity = _mapper.Map<ItineraryItem>(r);
					entity.TimeSlotType = timeSlot;
					entity.ItineraryId = itineraryId;
					entity.CreatedAt = DateTimeOffset.UtcNow;
					entity.UpdatedAt = DateTimeOffset.UtcNow;
					return entity;
				}).ToList();

				//Check for Item Sort by Time correctness
				var isSortByTimeCorrect = ItineraryItemHelper.IsItemListSortByTimeCorrect(allItems, items);
				if (!isSortByTimeCorrect)
				{
					return ApiResponse<bool>.ErrorResultWithCode(
						$"The Itinerary Items' Start Time and End Time are not in correct order based on the existing Itinerary Items. " +
						$"Please ensure the times are sequentially ordered within the day.",
						(int)ResponseCode.BadRequest);
				}

				await _itineraryItemRepository.CreateBatchAsync(items);

				

				//Calculate Transport Duration from the Itinerary Items before this (newly added) Itinerary Items
				foreach (var item in items)
				{
					CalculateDurationOfItineraryItems(itineraryId: itineraryId, trackedItem: item).Wait();
				}

				await _unitOfWork.CommitAsync();

				return ApiResponse<bool>.SuccessResult(true, "Batch of itinerary items added successfully");
			}
			catch (Exception)
			{
				await _unitOfWork.RollbackAsync();
				throw;
			}

		}



		public async Task<ApiResponse<List<ItineraryDayScheduleDto>>> GetAllItineraryItemsAsync(Guid itineraryId)
		{

			var items = await _itineraryItemRepository.GetAllByItineraryIdAsync(itineraryId);

			if (items == null || !items.Any())
				return ApiResponse<List<ItineraryDayScheduleDto>>.SuccessResult(new List<ItineraryDayScheduleDto>(), "No itinerary items found");

			var grouped = ItineraryHelper.ConvertListOfItineraryItemsToItineraryDayScheduleDto(items, _mapper);
			return ApiResponse<List<ItineraryDayScheduleDto>>.SuccessResult(grouped);

		}


		public async Task<ApiResponse<bool>> DeleteItineraryItemByIdAsync(Guid itineraryItemId)
		{
			await _unitOfWork.BeginTransactionAsync();
			try
			{
				var existing = await _itineraryItemRepository.GetByIdAsync(itineraryItemId);
				if (existing == null)
					return ApiResponse<bool>.ErrorResultWithCode("This Itinerary Item not found with the ID: " + itineraryItemId, (int)ResponseCode.NotFound);

				await _itineraryItemRepository.DeleteAsync(itineraryItemId);

				var newItemsList = await _itineraryItemRepository.GetAllByItineraryIdAsync(existing.ItineraryId);				

				//Calculate Transport Duration from the Itinerary Items before this (newly added) Itinerary Items 
				CalculateDurationOfAllItineraryItems(newItemsList, existing.DayNumber).Wait();

				// Commit all changes in a single transaction
				await _unitOfWork.CommitAsync();

				return ApiResponse<bool>.SuccessResult(true, message: "Delete Itinerary Item successfully");

			}
			catch (Exception)
			{

				await _unitOfWork.RollbackAsync();
				throw;
			}
		}

		public async Task<ApiResponse<bool>> UpdateItineraryItemAsync(Guid itineraryItemId, ItineraryItemUpdateDto request)
		{
			
			await _unitOfWork.BeginTransactionAsync();
			try
			{
				var existing = await _itineraryItemRepository.GetByIdAsync(itineraryItemId);

				if (existing == null)
				{
					return ApiResponse<bool>.ErrorResultWithCode("Failed to update Itinerary Item",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"Itinerary Item"+ itineraryItemId +" not found in database"
						}
				);
				}


				// Get all items in the same itinerary
				var allItems = await _itineraryItemRepository.GetAllByItineraryIdAsync(existing.ItineraryId);

				//Check for Start Time and End Time overlap 
				if (ItineraryItemHelper.IsTimeSpanOverlappingOnUpdate(allItems, itineraryItemId, request.DayNumber, request.StartTime.Value, request.EndTime.Value,
					out TimeSpan exisitingStartTime, out TimeSpan exisitingEndTime))
				{
					return ApiResponse<bool>.ErrorResultWithCode(
						$"Time conflict detected: {request.StartTime.Value} to {request.EndTime.Value}" +
						$"overlaps with another itinerary item time {exisitingStartTime} to {exisitingEndTime} " +
						$"on Day {request.DayNumber}.",
						(int)ResponseCode.BadRequest);
				}

				//Check for duplicate SortOrder within same Day & TimeSlot

				string TimeSlot = ItineraryItemHelper.GetTimeSlotTypeBasedOnItineraryTimes(request.StartTime.Value, request.EndTime.Value);

				var isDuplicate = await ItineraryItemHelper.IsSortOrderDuplicateOnUpdateAsync
					(allItems, itineraryItemId, request.DayNumber, request.SortOrder);

				if (isDuplicate)
				{

					return ApiResponse<bool>.ErrorResultWithCode(
						$"There already an Itinerary Item in Order {request.SortOrder} for Day {request.DayNumber}, " +
							$"please select other time slot",
						(int)ResponseCode.BadRequest);
				}

				//Applying request changes to existing entity
				var updateItems = _mapper.Map(request, existing);

				//Check for Item Sort by Time correctness
				var isSortByTimeCorrect = ItineraryItemHelper.IsItemSortByTimeCorrect(allItems, updateItems);

				if (!isSortByTimeCorrect)
				{
					return ApiResponse<bool>.ErrorResultWithCode(
						$"The Itinerary Item's Start Time and End Time are not in correct order based on the existing Itinerary Items. " +
						$"Please ensure the times are sequentially ordered within the day.",
						(int)ResponseCode.BadRequest);
				}

				updateItems.TimeSlotType = TimeSlot;

				//Update the entity to database
				await _itineraryItemRepository.UpdateAsync(updateItems);

				//Calculate Transport Duration from the Itinerary Items before this (newly added) Itinerary Items
				CalculateDurationOfAllItineraryItems(allItems, existing.DayNumber).Wait();

				await _unitOfWork.CommitAsync();

				return ApiResponse<bool>.SuccessResult(true, message: "Update Itinerary Item successfully");
			}
			catch (Exception)
			{
				await _unitOfWork.RollbackAsync();
				throw;
			}
			
			
		}

		public async Task<ApiResponse<bool>> ReorderItineraryItemsAsync(Guid itineraryId, List<ItineraryItemReorderDto> reorderedItems)
		{
			await _unitOfWork.BeginTransactionAsync();
			try
			{
				var itinerary = await _itineraryRepository.GetByIdAsync(itineraryId);

				if (itinerary == null)
					return ApiResponse<bool>.ErrorResultWithCode("Itinerary not found", (int)ResponseCode.NotFound);


				var items = await _itineraryItemRepository.GetAllByItineraryIdAsync(itineraryId);
				if (items == null || !items.Any())
					return ApiResponse<bool>.ErrorResultWithCode("No items found to reorder", (int)ResponseCode.NotFound);

				//Validate for duplicates in the list before updating
				bool hasDuplicates = ItineraryItemHelper.HasDuplicateSortOrdersInRequestList(reorderRequests: reorderedItems, createRequests: null);

				if (hasDuplicates)
				{
					return ApiResponse<bool>.ErrorResultWithCode(
						"There are itinerary items share the same order detected within the request list. " +
						"Each NewDayNumber combination must have unique SortOrders to avoid conflict.",
						(int)ResponseCode.BadRequest
					);
				}

				if (ItineraryItemHelper.HasDuplicateTimeRanges(reorderRequest: reorderedItems, createRequest: null))
				{
					return ApiResponse<bool>.ErrorResultWithCode(
						"There are itinerary items share the same time range detected within the request list. " +
						"Each NewDayNumber must have unique time ranges to avoid conflict.",
						(int)ResponseCode.BadRequest
					);
				}

				foreach (var reorder in reorderedItems)
				{
					var item = items.FirstOrDefault(i => i.ItemId == reorder.ItemId);
					if (item != null)
					{
						var newDayNumber = reorder.NewDayNumber > 0 ? reorder.NewDayNumber : item.DayNumber;

						string reorderTimeSlot = ItineraryItemHelper.GetTimeSlotTypeBasedOnItineraryTimes(reorder.StartTime.Value, reorder.EndTime.Value);

						var newTimeSlot = !string.IsNullOrEmpty(reorderTimeSlot)
							? reorderTimeSlot
							: item.TimeSlotType;

						// Check for duplicate SortOrder within same Day & TimeSlot
						bool isDuplicate = await ItineraryItemHelper.IsSortOrderDuplicateAsync(items, newDayNumber, reorder.NewSortOrder, item.ItemId);
						if (isDuplicate)
						{
							return ApiResponse<bool>.ErrorResultWithCode(
								$"There already an Itinerary Item in Order {reorder.NewSortOrder} for Day {newDayNumber} and {newTimeSlot} Activity, " +
								$"please select other time slot",
								errorStatusCode: (int)ResponseCode.BadRequest
							);
						}

						// Update values
						item.SortOrder = reorder.NewSortOrder;
						item.TimeSlotType = newTimeSlot;
						item.DayNumber = newDayNumber;
						item.TimeSlotType = newTimeSlot;
						item.UpdatedAt = DateTimeOffset.UtcNow;
						await _itineraryItemRepository.UpdateRangeAsync(items);

					}

					//Calculate Transport Duration from the Itinerary Items before this (newly added) Itinerary Items
					CalculateDurationOfAllItineraryItems(items, item.DayNumber).Wait();

				}

				await _unitOfWork.CommitAsync();

				return ApiResponse<bool>.SuccessResult(true, "Itinerary items reordered successfully");
			}
			catch (Exception)
			{
				await _unitOfWork.RollbackAsync();
				throw;
			}
			
			
		}

		

		//Private Methods

		//Calculate the transport duration for the tracked Itinerary Item, alongside the previous and the next Itinerary Item 
		//Scan through the list and find the tracked Itinerary Item, then calculate the duration between the previous and next Itinerary Item respectively
		//Good for updating or adding single Itinerary Item, not so good for batch update/add
		//First Itinerary Items of the day will have transport duration = 0
		//Mainly use SortOrder and NewDayNumber to identify the previous and next Itinerary Item
		private async Task CalculateDurationOfItineraryItems(Guid itineraryId, ItineraryItem trackedItem)
		{
			try
			{
				_logger.LogInformation("Starting duration calculation for ItineraryId: {ItineraryId}, TrackedItemId: {ItemId}",
					itineraryId, trackedItem.ItemId);

				var itemsList = await _itineraryItemRepository.GetAllByItineraryIdAsync(itineraryId);
				if (itemsList == null || !itemsList.Any())
				{
					_logger.LogWarning("No itinerary items found for ItineraryId: {ItineraryId}", itineraryId);
					return;
				}

				var groupedByDay = itemsList.GroupBy(i => i.DayNumber).ToList();
				_logger.LogInformation("Itinerary items grouped into {DayCount} days", groupedByDay.Count);

				// Using LinkedList for traversal
				LinkedList<ItineraryItem> linkedList = new LinkedList<ItineraryItem>(
					itemsList.OrderBy(i => i.DayNumber)
							 .ThenBy(i => i.SortOrder)
				);

				var currentNode = linkedList.Find(trackedItem);
				if (currentNode == null)
				{
					_logger.LogWarning("Tracked item {ItemId} not found in itinerary {ItineraryId}", trackedItem.ItemId, itineraryId);
					return;
				}

				var currentItineraryItem = currentNode.Value;
				var previousItineraryItem = currentNode.Previous?.Value;
				var nextItineraryItem = currentNode.Next?.Value;

				if (previousItineraryItem == null)
				{
					_logger.LogInformation("No previous item found for item {ItemId} (Day {NewDayNumber})", currentItineraryItem.ItemId, currentItineraryItem.DayNumber);
				}
				if (nextItineraryItem == null)
				{
					_logger.LogInformation("No next item found for item {ItemId} (Day {NewDayNumber})", currentItineraryItem.ItemId, currentItineraryItem.DayNumber);
				}

				// --- Calculate transport duration for currentNode ---
				if (previousItineraryItem != null)
				{
					double currentNodeLon = currentItineraryItem.Place.Longitude;
					double currentNodeLat = currentItineraryItem.Place.Latitude;
					double previousNodeLon = previousItineraryItem.Place.Longitude;
					double previousNodeLat = previousItineraryItem.Place.Latitude;

					string currentDrivingMode = currentItineraryItem.TransportMethod?.ToLower() ?? "driving";

					_logger.LogInformation("Calculating duration between previous ({PrevPlace}) and current ({CurrPlace}) using mode '{Mode}'",
						previousItineraryItem.Place.Name, currentItineraryItem.Place.Name, currentDrivingMode);

					// TODO: Implement GetDurationBetweenTwoPlaces in ITrackAsiaService
					// var currentDuration = await _routeCalculator.GetDurationBetweenTwoPlaces(...);
					var currentDuration = 0; // Default value for now

					_logger.LogInformation("Duration from previous to current: {Duration} seconds", currentDuration);
					currentItineraryItem.TransportDuration = (int?)currentDuration;

					await _itineraryItemRepository.UpdateAsync(currentItineraryItem);
					_logger.LogInformation("Updated current item {ItemId} with transport duration {Duration}", currentItineraryItem.ItemId, currentDuration);
				}

				// --- Calculate transport duration for nextNode ---
				if (nextItineraryItem != null)
				{
					double currentNodeLon = currentItineraryItem.Place.Longitude;
					double currentNodeLat = currentItineraryItem.Place.Latitude;
					double nextNodeLon = nextItineraryItem.Place.Longitude;
					double nextNodeLat = nextItineraryItem.Place.Latitude;

					string nextDrivingMode = nextItineraryItem.TransportMethod?.ToLower() ?? "driving";

					_logger.LogInformation("Calculating duration between current ({CurrPlace}) and next ({NextPlace}) using mode '{Mode}'",
						currentItineraryItem.Place.Name, nextItineraryItem.Place.Name, nextDrivingMode);

					// TODO: Implement GetDurationBetweenTwoPlaces in ITrackAsiaService
					// var nextDuration = await _routeCalculator.GetDurationBetweenTwoPlaces(...);
					var nextDuration = 0; // Default value for now

					_logger.LogInformation("Duration from current to next: {Duration} seconds", nextDuration);
					nextItineraryItem.TransportDuration = (int?)nextDuration;

					await _itineraryItemRepository.UpdateAsync(nextItineraryItem);
					_logger.LogInformation("Updated next item {ItemId} with transport duration {Duration}", nextItineraryItem.ItemId, nextDuration);
				}

				_logger.LogInformation("Duration calculation completed for itinerary {ItineraryId}", itineraryId);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error calculating durations for ItineraryId: {ItineraryId}, TrackedItemId: {ItemId}",
					itineraryId, trackedItem?.ItemId);
				throw;
			}
		}

		//Calculate the transport duration for all Itinerary Items in the specified dayNumber
		//Scan through the list and calculate the duration between each Itinerary Item respectively
		//Not good a big list, hence the partional calculation by dayNumber
		//Useful for batch adding and update, good for deleting Itinerary Items as well
		//First Itinerary Items of the day will have transport duration = 0
		//Mainly use SortOrder and NewDayNumber to identify the previous and next Itinerary Item
		private async Task CalculateDurationOfAllItineraryItems(List<ItineraryItem> itineraryItems, int dayNumber)
		{
			try
			{
				_logger.LogInformation("Starting duration calculation for Day {NewDayNumber} with {ItemCount} itinerary items.",
					dayNumber, itineraryItems?.Count ?? 0);

				if (itineraryItems == null || !itineraryItems.Any())
				{
					_logger.LogWarning("No itinerary items provided for day {NewDayNumber}.", dayNumber);
					return;
				}

				var itemsInDay = itineraryItems
					.Where(i => i.DayNumber == dayNumber)
					.OrderBy(i => i.DayNumber)
					.ThenBy(i => i.SortOrder)
					.ToList();

				if (!itemsInDay.Any())
				{
					_logger.LogWarning("No itinerary items found for Day {NewDayNumber}.", dayNumber);
					return;
				}

				LinkedList<ItineraryItem> linkedList = new LinkedList<ItineraryItem>(itemsInDay);
				_logger.LogDebug("Day {NewDayNumber} converted to LinkedList with {Count} items.", dayNumber, linkedList.Count);

				foreach (var node in linkedList)
				{
					var currentNode = linkedList.Find(node);
					var currentItineraryItem = currentNode?.Value;
					var previousItineraryItem = currentNode?.Previous?.Value;
					var nextItineraryItem = currentNode?.Next?.Value;

					if (currentItineraryItem == null)
					{
						_logger.LogWarning("Encountered a null current itinerary item on Day {NewDayNumber}. Skipping.", dayNumber);
						continue;
					}

					_logger.LogInformation("Processing itinerary item {ItemId} ({Title}) on Day {NewDayNumber}.",
						currentItineraryItem.ItemId, currentItineraryItem.ActivityTitle, dayNumber);

					// --- Handle first node (no previous) ---
					if (previousItineraryItem == null)
					{
						currentItineraryItem.TransportDuration = 0;
						await _itineraryItemRepository.UpdateAsync(currentItineraryItem);
						_logger.LogInformation("First node detected. Set transport duration = 0 for ItemId {ItemId}.",
							currentItineraryItem.ItemId);
						continue;
					}

					// --- Calculate transport duration from previous to current ---
					try
					{
						double currentNodeLon = currentItineraryItem.Place.Longitude;
						double currentNodeLat = currentItineraryItem.Place.Latitude;
						double previousNodeLon = previousItineraryItem.Place.Longitude;
						double previousNodeLat = previousItineraryItem.Place.Latitude;

						string currentDrivingMode = currentItineraryItem.TransportMethod?.ToLower() ?? "driving";

						_logger.LogInformation("Calculating duration between {PrevPlace} → {CurrPlace} using mode '{Mode}'",
							previousItineraryItem.Place?.Name ?? "Unknown",
						currentItineraryItem.Place?.Name ?? "Unknown",
						currentDrivingMode);

					// TODO: Implement GetDurationBetweenTwoPlaces in ITrackAsiaService
					// var currentDuration = await _routeCalculator.GetDurationBetweenTwoPlaces(...);
					var currentDuration = 0; // Default value for now

						currentItineraryItem.TransportDuration = (int?)currentDuration;
						await _itineraryItemRepository.UpdateAsync(currentItineraryItem);

						_logger.LogInformation("Updated ItemId {ItemId} ({Title}) with transport duration {Duration} sec (from previous).",
							currentItineraryItem.ItemId, currentItineraryItem.ActivityTitle, currentDuration);
					}
					catch (Exception ex)
					{
						_logger.LogError(ex, "Error calculating current duration for ItemId {ItemId} on Day {NewDayNumber}.",
							currentItineraryItem.ItemId, dayNumber);
					}

					// --- Calculate transport duration from current to next ---
					if (nextItineraryItem == null)
					{
						_logger.LogInformation("Item {ItemId} is the last node of Day {NewDayNumber}. No next duration to calculate.",
							currentItineraryItem.ItemId, dayNumber);
						continue;
					}

					try
					{
						double currentNodeLon = currentItineraryItem.Place.Longitude;
						double currentNodeLat = currentItineraryItem.Place.Latitude;
						double nextNodeLon = nextItineraryItem.Place.Longitude;
						double nextNodeLat = nextItineraryItem.Place.Latitude;

						string nextDrivingMode = nextItineraryItem.TransportMethod?.ToLower() ?? "driving";

						_logger.LogInformation("Calculating duration between {CurrPlace} → {NextPlace} using mode '{Mode}'",
							currentItineraryItem.Place?.Name ?? "Unknown",
						nextItineraryItem.Place?.Name ?? "Unknown",
						nextDrivingMode);

					// TODO: Implement GetDurationBetweenTwoPlaces in ITrackAsiaService
					// var nextDuration = await _routeCalculator.GetDurationBetweenTwoPlaces(...);
					var nextDuration = 0; // Default value for now

						nextItineraryItem.TransportDuration = (int?)nextDuration;
						await _itineraryItemRepository.UpdateAsync(nextItineraryItem);

						_logger.LogInformation("Updated next ItemId {ItemId} ({Title}) with transport duration {Duration} sec (from current).",
							nextItineraryItem.ItemId, nextItineraryItem.ActivityTitle, nextDuration);
					}
					catch (Exception ex)
					{
						_logger.LogError(ex, "Error calculating next duration for ItemId {ItemId} on Day {NewDayNumber}.",
							currentItineraryItem.ItemId, dayNumber);
					}
				}

				_logger.LogInformation("Completed transport duration calculations for all items on Day {NewDayNumber}.", dayNumber);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Unexpected error in CalculateDurationOfAllItineraryItems for Day {NewDayNumber}.", dayNumber);
				throw;
			}
		}
	}
}
