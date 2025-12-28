
using Application.Interfaces;
using Infrastructure.Models.ItineraryDTO;
using Microsoft.AspNetCore.Mvc;
using Infrastructure.Models.Common;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;

namespace API.Controllers.Itinerary
{
	/// <summary>
	/// Handle route/itinerary plan calculation and optimization operation
	/// </summary>
	
	[Route("api/calculate")]
	[ApiController]
	public class ItineraryRouteCalculationController : Controller
	{
		private readonly IRouteCalculationService _routeCalculationService;

		public ItineraryRouteCalculationController(IRouteCalculationService routeCalculationService)
		{
			_routeCalculationService = routeCalculationService;
		}

		/// <summary>
		/// Calculate the distance between each leg from specific itinerary plan given the Id (User role)
		/// </summary>
		/// <param name="itineraryId">ID of the Itinerary</param>
		/// <param name="transportMethod">Select transport method</param>
		/// <returns></returns>
		[HttpGet("/distance-matrix-itinerary/{itineraryId}")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> CalculateEachLegFromItinerary([FromRoute] Guid itineraryId, [FromQuery] TransportMethod transportMethod)
		{
			if (itineraryId == Guid.Empty)
			{
				return BadRequest(ApiResponse<ItineraryDetailDto>.ErrorResultWithCode("ItineraryId is required", errorStatusCode: 400));
			}

			var result = await _routeCalculationService.CalculateEachLegFromItinerary(itineraryId, transportMethod.ToString());

			if (!result.Success)
			{
				return StatusCode(result.StatusCode, result);
			}

			return Ok(result);
		}

		/// <summary>
		/// Calculate the distance between each leg from specific itinerary plan given the Id (User role)
		/// </summary>
		/// <param name="itineraryId">ID of the Itinerary</param>	
		/// <returns></returns>
		[HttpGet("/route-itinerary/{itineraryId}")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> CalculateRouteFromItinerary([FromRoute] Guid itineraryId)
		{
			if (itineraryId == Guid.Empty)
			{
				return BadRequest(ApiResponse<ItineraryDetailDto>.ErrorResultWithCode("ItineraryId is required", errorStatusCode: 400));
			}

			var result = await _routeCalculationService.CalculateRoutesFromItinerary(itineraryId);

			if (!result.Success)
			{
				return StatusCode(result.StatusCode, result);
			}

			return Ok(result);
		}

		/// <summary>
		/// Optimize Route given the Itinerary, only optimize with driving transport method (User role)
		/// </summary>
		/// <param name="itineraryId">ID of the Itinerary</param>
		/// <remarks>Currently, does not support multiple transport method due to extreme complexity
		/// . Also optimizing route will ignore sort order of itinerary items</remarks>
		/// <returns></returns>
		[HttpGet("/optimize-route/{itineraryId}")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> OptimizeRouteFromItineraryV2([FromRoute] Guid itineraryId)
		{
			if (itineraryId == Guid.Empty)
			{
				return BadRequest(ApiResponse<ItineraryDetailDto>.ErrorResultWithCode("ItineraryId is required", errorStatusCode: 400));
			}

			var result = await _routeCalculationService.OptimizeRouteFromItinerary(itineraryId);

			if (!result.Success)
			{
				return StatusCode(result.StatusCode, result);
			}

			return Ok(result);
		}
	}
}
