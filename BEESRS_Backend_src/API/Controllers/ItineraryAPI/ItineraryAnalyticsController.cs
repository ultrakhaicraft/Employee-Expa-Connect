using Application.Interfaces.ItineraryService;
using Infrastructure.Helper.Enum;
using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using Infrastructure.Models.ItineraryStatisticsDTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers.Itinerary
{
	[ApiController]
	[Route("api/itinerary")]
	public class ItineraryAnalyticsController : Controller
	{
		private readonly IItineraryStatisticService _itineraryStatisticService;

		public ItineraryAnalyticsController(IItineraryStatisticService itineraryStatisticService)
		{
			_itineraryStatisticService = itineraryStatisticService;
		}


		/// <summary>
		/// Get user itinerary statistics: number of itineraries created, templates created, itineraries completed, and itineraries shared. (User Role)
		/// Requires authentication.
		/// </summary>
		/// <returns></returns>
		[HttpGet("user-statistics")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetUserItineraryStatistics()
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

				if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
				{
					return BadRequest(ApiResponse<UserItineraryStatDto>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
				}

				var response = await _itineraryStatisticService.GetUserItineraryStatisticsAsync(userId);
				if (response.Success)
				{
					return Ok(response);
				}
				return BadRequest(response);
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to get user itinerary statistics due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when getting user itinerary statistic"
					}
				));
			}
		}

		[HttpGet("{itineraryId}/itinerary-statistics")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetItineraryStatistics([FromRoute] Guid itineraryId)
		{

			try
			{
				if (itineraryId == Guid.Empty)
				{
					return BadRequest(ApiResponse<ItineraryDetailDto>.ErrorResultWithCode("ItineraryId is required", errorStatusCode: 400));
				}

				var response = await _itineraryStatisticService.GetItineraryStatisticsAsync(itineraryId);
				if (response.Success)
				{
					return Ok(response);
				}
				return BadRequest(response);
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to get itinerary statistics due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when getting itinerary statistic"
					}
				));
			}
		}
	}
}
