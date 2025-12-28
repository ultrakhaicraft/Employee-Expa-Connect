using Application.Interfaces.ItineraryService;
using Infrastructure.Helper.Enum;
using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using Infrastructure.Models.ItineraryShareDTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers.Itinerary
{
	[Route("api/itinerary")]
	[ApiController]
	public class ItinerarySharingController : Controller
	{

		private readonly IItineraryShareService _itineraryShareService;

		public ItinerarySharingController(IItineraryShareService itineraryShareService)
		{
			_itineraryShareService = itineraryShareService;
		}




		/// <summary>
		/// Share the itinerary with other users by userId (not email yet)
		/// The shared itinerary will be read-only for the users it is shared with (User role)
		/// </summary>
		/// <param name="request"></param>
		/// <param name="itineraryId"></param>
		/// <returns></returns>
		[HttpPost("{itineraryId}/share")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> ShareItineraryAsync([FromBody] ItineraryShareCreateDto request, [FromRoute] Guid itineraryId)
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

				if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
				{
					return BadRequest(ApiResponse<bool>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
				}

				if (request == null)
				{
					return BadRequest(ApiResponse<string>.
						ErrorResultWithCode("Request body is null, please input the itinerary share information", errorStatusCode: 400));
				}

				if (!ModelState.IsValid)
				{
					return BadRequest(ModelState);
				}

				var response = await _itineraryShareService.ShareItineraryAsync(request, itineraryId, userId);

				if (response.Success)
				{
					return Ok(response);
				}
				else
				{
					return StatusCode(response.StatusCode, response);
				}
			}
			catch (Exception e)
			{


				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to share itinerary due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when sharing itinerary"
					}
				));
			}

		}

		/// <summary>
		/// Revoke the share access of an itinerary from a user it was previously shared with (User role), need log in
		/// </summary>
		/// <param name="shareId"></param>
		/// <returns></returns>
		[HttpDelete("shares/{shareId}")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> RevokeShare([FromRoute] Guid shareId)
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

				if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
				{
					return BadRequest(ApiResponse<bool>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 404));
				}

				if (shareId == Guid.Empty)
				{
					return BadRequest(ApiResponse<bool>.ErrorResultWithCode("shareId is required", errorStatusCode: 404));
				}

				Console.WriteLine("Entering revoke share itinerary");
				var response = await _itineraryShareService.RevokeShareItineraryAsync(shareId, userId);
				if (response.Success)
				{
					return Ok(response);
				}
				else
				{
					return StatusCode(response.StatusCode, response);
				}
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to revoke itinerary share due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when revoking itinerary share"
					}
				)); 
			}

		}


		/// <summary>
		/// Get all itineraries shared with the current user (user role)
		/// </summary>
		/// <returns></returns>
		[HttpGet("shared-with-me")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetSharedWithMe()
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

				if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
				{
					return BadRequest(ApiResponse<bool>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
				}

				var response = await _itineraryShareService.GetSharedWithMeAsync(userId);
				if (response.Success)
				{
					return Ok(response);
				}
				else
				{
					return StatusCode(response.StatusCode, response);
				}
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to get itineraries share with me due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when getting itinerary share with me"
					}
				)); 
			}
		}

		/// <summary>
		/// Get all available shares for a specific itinerary (user role)
		/// </summary>
		/// <param name="itineraryId"></param>
		/// <returns></returns>
		[HttpGet("{itineraryId}/shares")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetShareList([FromRoute] Guid itineraryId)
		{
			try
			{
				if (itineraryId == Guid.Empty)
					return BadRequest(ApiResponse<string>.ErrorResultWithCode("Itinerary ID is required", 400));

				var response = await _itineraryShareService.GetSharesByItineraryIdAsync(itineraryId);
				if (response.Success)
				{
					return Ok(response);
				}
				else
				{
					return StatusCode(response.StatusCode, response);
				}
			}
			catch (Exception e)
			{
				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to get share list from itinerary due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when getting share list from itinerary"
					}
				));
			}
		}


	}
}
