using Application.Helper;
using Application.Interfaces;
using Application.Interfaces.ThirdParty;
using Application.Services.ThirdParty;
using AutoMapper;
using Azure.Core;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Helper.Enum;
using Infrastructure.Interfaces.Personal_Itinerary;
using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryShareDTO;
using Infrastructure.Models.RouteCalculationDTO;
using Infrastructure.Repositories.Personal_Itinerary;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Application.Services
{
	public class RouteCalculationService : IRouteCalculationService
	{
		private readonly ITrackAsiaService _routeCalculator; //Use TrackAsia Service
		private readonly IItineraryRepository _itineraryRepository;
		private readonly IItineraryItemRepository _itineraryItemRepository;
		private readonly RouteCalculationHelper _routeCalculationHelper;

		public RouteCalculationService(ITrackAsiaService routeCalculator, IItineraryRepository itineraryRepository, IItineraryItemRepository itineraryItemRepository)
		{
			_routeCalculator = routeCalculator;
			_itineraryRepository = itineraryRepository;
			_itineraryItemRepository = itineraryItemRepository;
			_routeCalculationHelper = new RouteCalculationHelper();
		}




		/// <summary>
		/// Calculate the distance between each leg from specific itinerary plan given the Id
		/// </summary>
		/// <returns></returns>
		public async Task<ApiResponse<List<ItineraryLegDto>>> CalculateEachLegFromItinerary(Guid ItineraryId, string profile)
		{
			try
			{
				var itineraryItems = await _itineraryItemRepository.GetAllByItineraryIdAsync(ItineraryId);
				if (itineraryItems == null || itineraryItems.Count <= 0)
				{
					return ApiResponse<List<ItineraryLegDto>>.ErrorResultWithCode("Itinerary item not found",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"Itinerary item not found in database or the itinerary in which this item belong to" +
							"not found"
						}
					);
				}

				//Begin extract coordinate data from Place object, which coming from ItineraryItems 

				var items = itineraryItems
					.Where(i => i.Place != null)
					.OrderBy(i => i.DayNumber)
					.ThenBy(i => i.SortOrder)
					.ToList();



				if (items.Count < 2)
				{
					return ApiResponse<List<ItineraryLegDto>>.ErrorResultWithCode(
						"At least two valid places are required to calculate distances",
						errorStatusCode: (int)ResponseCode.BadRequest);
				}

				// Build coordinate list for TrackAsia (long, lat)
				var coords = items
					.Select(i => (i.Place.Longitude, i.Place.Latitude))
					.ToList();

			//Select the following within the coordinate list as each legs starting point and destination by using the index
			var sources = Enumerable.Range(0, coords.Count - 1).ToArray();       // 0,1,2,...
			var destinations = Enumerable.Range(1, coords.Count - 1).ToArray();  // 1,2,3,...

			// TODO: Implement GetDistanceMatrixAsync in ITrackAsiaService
			// var jsonResponse = await _routeCalculator.GetDistanceMatrixAsync(...);
			// TrackAsiaDistanceMatrixResponse? matrix = JsonSerializer.Deserialize<TrackAsiaDistanceMatrixResponse>(jsonResponse, JsonSerializerDefault.JsonOptions);
			throw new NotImplementedException("GetDistanceMatrixAsync not yet implemented in TrackAsiaService");

				/* Commented out until GetDistanceMatrixAsync is implemented
				if (matrix == null || matrix.Durations == null || matrix.Distances == null)
				{

					return ApiResponse<List<ItineraryLegDto>>.ErrorResultWithCode(
						"Failed to calculate distances via TrackAsia API",
						errorStatusCode: (int)ResponseCode.InternalServerError);
				}

				var legs = new List<ItineraryLegDto>();
				int n = matrix.Durations.Count;

				//Select the right distance and duration data from matrix, typically diagonally right
				for (int i = 0; i < n; i++)
				{
					// pick the element that corresponds to item i -> item i+1
					double durationSec = 0;
					double distanceMeter = 0;


					if (matrix.Distances != null && i < matrix.Durations.Count && i < matrix.Durations[i].Count)
						durationSec = matrix.Durations[i][i];

					if (matrix.Distances != null && i < matrix.Distances.Count && i < matrix.Distances[i].Count)
						distanceMeter = matrix.Distances[i][i];

					legs.Add(new ItineraryLegDto
					{
						FromItineraryItemId = items[i].ItemId,
						DepartureName = items[i].Place.Name,
						ToItineraryItemId = items[i + 1].ItemId,
						DestinationName = items[i + 1].Place.Name,
						DurationSeconds = durationSec,
						DurationText= _routeCalculationHelper.FormatDuration(durationSec),
						DistanceMeters = distanceMeter,
						DistanceText = _routeCalculationHelper.FormatDistance(distanceMeter)
					});
				}

				return ApiResponse<List<ItineraryLegDto>>.SuccessResult(legs);
				*/
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<List<ItineraryLegDto>>.ErrorResult("Failed to calculate Itinerary leg", new List<string>()
						{
							e.Message ?? "Exception error caught calculate Itinerary"
						}
				);
			}

		}


		public async Task<ApiResponse<List<ItineraryLegDto>>> CalculateRoutesFromItinerary(Guid ItineraryId)
		{
			try
			{
				var itineraryItems = await _itineraryItemRepository.GetAllByItineraryIdAsync(ItineraryId);
				if (itineraryItems == null || itineraryItems.Count <= 0)
				{
					return ApiResponse<List<ItineraryLegDto>>.ErrorResultWithCode("Itinerary item not found",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"Itinerary item not found in database or the itinerary in which this item belong to" +
							"not found"
						}
					);
				}

				//Begin extract coordinate data from Place object, which coming from ItineraryItems 

				var items = itineraryItems
					.Where(i => i.Place != null)
					.OrderBy(i => i.DayNumber)
					.ThenBy(i => i.SortOrder)
					.ToList();



				if (items.Count < 2)
				{
					return ApiResponse<List<ItineraryLegDto>>.ErrorResultWithCode(
						"At least two valid places are required to calculate distances",
						errorStatusCode: (int)ResponseCode.BadRequest);
				}

				var legs = new List<ItineraryLegDto>();

				// ✅ Calculate each leg - Incompleted
				for (int i = 0; i < items.Count - 1; i++)
				{
					var from = items[i];
					var to = items[i + 1];

					// Use each item's preferred transport mode, must use the destination transport method
					string mode = to.TransportMethod.ToLower() ?? "driving";

					// TODO: Implement GetRouteAsync in ITrackAsiaService
					// var json = await _routeCalculator.GetRouteAsync(...);
					// var routeResponse = JsonSerializer.Deserialize<TrackAsiaRouteResponse>(json);
					throw new NotImplementedException("GetRouteAsync not yet implemented in TrackAsiaService");

					/* Commented out until GetRouteAsync is implemented
					var route = routeResponse?.Routes?.FirstOrDefault();
					var legData = route?.Legs?.FirstOrDefault();
					if (route == null || legData==null)
					{
						Console.WriteLine("No route found between {0} and {1}", from.Place.Name, to.Place.Name);
						continue;
					}
					


					legs.Add(new ItineraryLegDto
					{
						FromItineraryItemId = from.ItemId,
						DepartureName =from.Place.Name,
						ToItineraryItemId = to.ItemId,
						DestinationName =to.Place.Name,
						DistanceMeters = legData.Distance?.Value ?? 0,
						DurationSeconds = legData.Duration?.Value ?? 0,
						DurationText = legData.Duration?.Text ?? "0 giay",
						DistanceText = legData.Distance?.Text ?? "0 met",
						TransportMethod = mode
					});
					*/
				}

				return ApiResponse<List<ItineraryLegDto>>.SuccessResult(legs);
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<List<ItineraryLegDto>>.ErrorResult("Failed to calculate Itinerary leg", new List<string>()
						{
							e.Message ?? "Exception error caught calculate Itinerary"
						}
				);
			}
		}

		
		
		public async Task<ApiResponse<RouteOptimizationResponse>> OptimizeRouteFromItinerary(Guid itineraryId)
		{
			try
			{
				var itineraryItems = await _itineraryItemRepository.GetAllByItineraryIdAsync(itineraryId);
				if (itineraryItems == null || itineraryItems.Count <= 0)
				{
					return ApiResponse<RouteOptimizationResponse>.ErrorResultWithCode(
						"Itinerary items not found",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string> { "No itinerary items found for the given itinerary ID." }
					);
				}

				var items = itineraryItems
					.Where(i => i.Place != null)
					.OrderBy(i => i.DayNumber)
					.ThenBy(i => i.SortOrder)
					.ToList();

				if (items.Count < 2)
				{
					return ApiResponse<RouteOptimizationResponse>.ErrorResultWithCode(
						"At least two valid places are required to optimize the route",
						errorStatusCode: (int)ResponseCode.BadRequest
					);
				}

				//Track-asia API currently only support driving mode for optimization
				string mode = _routeCalculationHelper.ConvertTransportMethodToRightData(TransportMethod.Driving.ToString());

				// TODO: Implement OptimizeRouteAsync in ITrackAsiaService
				// var vrpResponse = await _routeCalculator.OptimizeRouteAsync(items, mode);
				throw new NotImplementedException("OptimizeRouteAsync not yet implemented in TrackAsiaService");

				/* Commented out until OptimizeRouteAsync is implemented
				if (vrpResponse == null)
					{
						return ApiResponse<RouteOptimizationResponse>.ErrorResult(
							"Optimization failed. Null response received from Track-Asia VRP API."
						);
					}

					// Parse VRP response into our DTO
					var result = new RouteOptimizationResponse
					{
						Success = vrpResponse.Code == 0,
						Code = vrpResponse.Code.ToString(),
						Error = vrpResponse.Error,
						TotalDistance = 0,
						TotalDistanceText = "0 mét",
						TotalDuration = 0,
						TotalDurationText = "0 giây"
					};

					// Handle unassigned jobs
					if (vrpResponse.Unassigned != null && vrpResponse.Unassigned.Count > 0)
					{
						result.UnassignedJobIds = vrpResponse.Unassigned
							.Select(u => Guid.TryParse(u.Id, out var id) ? id : Guid.Empty)
							.Where(id => id != Guid.Empty)
							.ToList();
					}

					result.ReorderedItems = BuildOptimizedLegs(items, vrpResponse, mode);

					result.TotalDuration = _routeCalculationHelper.GetTotalDuration(result.ReorderedItems);
					result.TotalDurationText = _routeCalculationHelper.FormatDuration(result.TotalDuration ?? 0);
					result.TotalDistance = _routeCalculationHelper.GetTotalDistance(result.ReorderedItems);
					result.TotalDistanceText = _routeCalculationHelper.FormatDistance(result.TotalDistance ?? 0);

					return ApiResponse<RouteOptimizationResponse>.SuccessResult(result, "Route optimization successful");
				*/
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);

				return ApiResponse<RouteOptimizationResponse>.ErrorResult(
					"Failed to optimize itinerary route",
					new List<string> { e.Message ?? "Unhandled exception during optimization" }
				);
			}

		}

	
		

		//Convert ItineraryItem into OptimizedRouteLegViewDto base on the order from VRP response
		private List<ItineraryLegDto> BuildOptimizedLegs(
	List<ItineraryItem> items,
	VrpResponse vrpResponse,
	string mode)
		{
			if (vrpResponse?.Routes == null || vrpResponse.Routes.Count == 0)
				return new();

			var route = vrpResponse.Routes.First();
			var (startItemId, endItemId) = ExtractVehicleDescriptionHelper.ExtractItemIds(route.Description);

			var steps = route.Steps;
			if (steps == null || steps.Count == 0)
				return new();

			// Extract ordered job IDs
			var orderedJobIds = steps
				.Where(s => s.Type == "job" || s.Type == "pickup" || s.Type == "delivery")
				.Select(s => s.Description)
				.ToList();

			// Map jobs back to itinerary items
			var orderedItems = orderedJobIds
				.Select(jobId => items.FirstOrDefault(i => i.ItemId.ToString() == jobId))
				.Where(i => i != null)
				.ToList();

			// Include start and end points if not already included
			var start = items.First();
			var end = items.Last();

			if (orderedItems.FirstOrDefault()?.ItemId != start.ItemId)
				orderedItems.Insert(0, start);

			if (orderedItems.LastOrDefault()?.ItemId != end.ItemId)
				orderedItems.Add(end);

			var legs = new List<ItineraryLegDto>();

			for (int i = 0; i < orderedItems.Count - 1; i++)
			{
				var from = orderedItems[i];
				var to = orderedItems[i + 1];

				double distance = 0;
				double duration = 0;

				// Determine which step corresponds to the current destination
				RouteStep step = null;

				if (i == 0)
				{
					// First leg → use data after "start"
					var startStep = steps.FirstOrDefault(s => s.Type == "start");
					var nextJobStep = steps.SkipWhile(s => s.Type != "job").FirstOrDefault();
					if (nextJobStep != null)
					{
						// Duration to reach the first job
						duration = nextJobStep.Duration.Value;
						distance = nextJobStep.Distance.Value;
					}
					else if (startStep != null)
					{
						duration = startStep.Duration.Value;
						distance = startStep.Distance.Value;

					}
				}
				else if (i == orderedItems.Count - 2)
				{
					// Last leg → use data from "end"
					var endStep = steps.FirstOrDefault(s => s.Type == "end");
					if (endStep != null)
					{
						duration = endStep.Duration.Value;
						distance = endStep.Distance.Value;
					}
				}
				else
				{
					// Normal leg between two jobs
					step = steps.FirstOrDefault(s => s.Description == to.ItemId.ToString());
					duration = step?.Duration ?? 0;
					distance = step?.Distance ?? 0;
				}

				// Apply start/end overrides
				Guid fromId = from.ItemId;
				Guid toId = to.ItemId;

				if (i == 0 && startItemId.HasValue)
					fromId = startItemId.Value;

				if (i == orderedItems.Count - 2 && endItemId.HasValue)
					toId = endItemId.Value;

				legs.Add(new ItineraryLegDto
				{
					FromItineraryItemId = fromId,
					DepartureName = from.Place?.Name,
					ToItineraryItemId = toId,
					DestinationName = to.Place?.Name,
					DurationSeconds = duration,
					DurationText = _routeCalculationHelper.FormatDuration(duration),
					DistanceMeters = distance,
					DistanceText = _routeCalculationHelper.FormatDistance(distance),
					TransportMethod = mode
				});
			}

			return legs;
		}

		
	}
}
