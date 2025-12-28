using Application.Interfaces.ItineraryService;
using Azure;
using Azure.Core;
using Domain.Entities;
using Infrastructure.Helper.Enum;
using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using Infrastructure.Models.ItineraryItemDTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers.Itinerary
{
	[Route("api/itinerary")]
	[ApiController]
	public class ItineraryItemController : Controller
	{
		private readonly IItineraryItemService _itineraryItemService;
		private readonly IItineraryService _itineraryService;

		public ItineraryItemController(
			IItineraryItemService itineraryItemService, IItineraryService itineraryService)
		{
			_itineraryItemService = itineraryItemService;
			_itineraryService = itineraryService;
			
		}



		/// <summary>
		/// Create a new Itinerary Item under a specific itinerary (User role)
		/// </summary>
		/// <param name="itineraryItemId"></param>
		/// <param name="request"></param>
		/// <returns></returns>
		[HttpPost("{itineraryId}/add-item")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> CreateItineraryItem([FromRoute] Guid itineraryId, [FromBody] ItineraryItemCreateDto request)
		{

			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
				if (!Guid.TryParse(userIdClaim, out var userId))
					return Unauthorized(ApiResponse<Guid>.ErrorResultWithCode("Invalid user ID " +
						"or You don't have permission to create this Itinerary item", errorStatusCode: 403));


				// Check if the current user is either the owner or has edit permission

				var isOwnerResponse = await _itineraryService.CheckItineraryOwner(itineraryId, userId);

				if (!isOwnerResponse.Success)
				{

					return StatusCode(isOwnerResponse.StatusCode, isOwnerResponse);

				}


				if (request == null)
				{
					return BadRequest(ApiResponse<string>.ErrorResultWithCode("Request body is null, please input the itinerary item information", errorStatusCode: 400));
				}

				if (itineraryId == Guid.Empty)
				{
					return BadRequest(ApiResponse<ItineraryDetailDto>.ErrorResultWithCode("ItineraryId is required", errorStatusCode: 400));
				}

				if (!ModelState.IsValid)
				{
					return BadRequest(ModelState);
				}

				var response = await _itineraryItemService.AddItineraryItemAsync(itineraryId, request);

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
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to create itinerary item for itinerary due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when creating itinerary item for itinerary"
					}
				));
			}
		}

		/// <summary>
		/// Create multiple itinerary items under a specific itinerary (User role)
		/// </summary>
		/// <param name="itineraryId"></param>
		/// <param name="request"></param>
		/// <returns></returns>
		[HttpPost("{itineraryId}/add-batch")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> CreateItineraryItemBatch([FromRoute] Guid itineraryId,
			[FromBody] List<ItineraryItemCreateDto> request)
		{

			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
				if (!Guid.TryParse(userIdClaim, out var userId))
					return Unauthorized(ApiResponse<Guid>.ErrorResultWithCode("Invalid user ID " +
						"or You don't have permission to delete this ID", errorStatusCode: 403));

				/* Check if the user has permission to edit the itinerary */
				var isOwnerResponse = await _itineraryService.CheckItineraryOwner(itineraryId, userId);

				if (!isOwnerResponse.Success)
				{

					return StatusCode(isOwnerResponse.StatusCode, isOwnerResponse);

				}

				if (request == null)
				{
					return BadRequest(ApiResponse<string>.ErrorResultWithCode("Request body is null, please input the itinerary item information", errorStatusCode: 400));
				}

				if (itineraryId == Guid.Empty)
				{
					return BadRequest(ApiResponse<ItineraryDetailDto>.ErrorResultWithCode("ItineraryId is required", errorStatusCode: 400));
				}

				if (!ModelState.IsValid)
				{
					return BadRequest(ModelState);
				}

				var response = await _itineraryItemService.AddItineraryItemsBatchAsync(itineraryId, request);

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
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to adding multiple itinerary items into Itinerary due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when adding multiple itinerary items into Itinerary "
					}
				));
			}
		}

		/// <summary>
		/// Get all itinerary items under a specific itinerary (User role)
		/// </summary>
		/// <param name="itineraryId"></param>
		/// <returns></returns>
		[HttpGet("{itineraryId}/get-all")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> GetAllItineraryByItinerary([FromRoute] Guid itineraryId)
		{
			try
			{
				if (itineraryId == Guid.Empty)
				{
					return BadRequest(ApiResponse<ItineraryDetailDto>.ErrorResultWithCode("ItineraryId is required", errorStatusCode: 400));
				}

				var response = await _itineraryItemService.GetAllItineraryItemsAsync(itineraryId);

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
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to get all itinerary items from Itinerary due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when getting all itinerary items from Itinerary"
					}
				));
			}
		}

		/// <summary>
		/// Update a Itinerary Item based on itinerary item Id, this does not update the parent itinerary
		/// </summary>
		/// <param name="itineraryItemId"></param>
		/// <param name="request"></param>
		/// <returns></returns>
		[HttpPut("update/{itineraryItemId}")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> UpdateItineraryItemsAsync([FromRoute] Guid itineraryItemId, [FromBody] ItineraryItemUpdateDto request)
		{

			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
				if (!Guid.TryParse(userIdClaim, out var userId))
					return Unauthorized(ApiResponse<Guid>.ErrorResultWithCode("Invalid user ID " +
						"or You don't have permission to delete this ID", errorStatusCode: 403));

				/* Check if the user has permission to edit the itinerary */
				var isOwnerResponse = await _itineraryService.CheckItineraryOwnerByItineraryItem(itineraryItemId, userId);

				if (!isOwnerResponse.Success)
				{

					return StatusCode(isOwnerResponse.StatusCode, isOwnerResponse);

				}

				if (request == null)
				{
					return BadRequest(ApiResponse<string>.ErrorResultWithCode("Request body is null, please input the itinerary information", errorStatusCode: 400));
				}

				if (itineraryItemId == Guid.Empty)
				{
					return BadRequest(ApiResponse<string>.ErrorResultWithCode("itineraryId is required", errorStatusCode: 400));
				}

				if (!ModelState.IsValid)
				{
					return BadRequest(ModelState);
				}

				var response = await _itineraryItemService.UpdateItineraryItemAsync(itineraryItemId, request);
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
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to update an itinerary item due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when updating an itinerary item from Itinerary"
					}
				));
			}
		}

		/// <summary>
		/// Delete an existing itinerary item based on itinerary item Id, does not delete the parent itinerary
		/// </summary>
		/// <param name="itineraryItemId"></param>
		/// <returns></returns>
		[HttpDelete("delete/{itineraryItemId}")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> DeleteItineraryItemAsync([FromRoute] Guid itineraryItemId)
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
				if (!Guid.TryParse(userIdClaim, out var userId))
					return Unauthorized(ApiResponse<Guid>.ErrorResultWithCode("Invalid user ID " +
						"or You don't have permission to delete this ID", errorStatusCode: 403));

				/* Check if the user has permission to edit the itinerary */
				var isOwnerResponse = await _itineraryService.CheckItineraryOwnerByItineraryItem(itineraryItemId, userId);

				if (!isOwnerResponse.Success)
				{
					return StatusCode(isOwnerResponse.StatusCode, isOwnerResponse);
				}

				if (itineraryItemId == Guid.Empty)
				{
					return BadRequest(ApiResponse<string>.ErrorResultWithCode("itineraryItemId is required", errorStatusCode: 400));
				}
				var response = await _itineraryItemService.DeleteItineraryItemByIdAsync(itineraryItemId);
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
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to delete an itinerary item due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when deleting an itinerary item from Itinerary"
					}
				));
			}
		}

		/// <summary>
		/// Reorder Itinerary Item into different time slot in Itinerary (User only)
		/// </summary>
		/// <param name="itineraryId"></param>
		/// <param name="reorderedItems"></param>
		/// <returns></returns>
		[HttpPatch("{itineraryId}/reorder")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> ReorderItineraryItemFromItinerary([FromRoute] Guid itineraryId, [FromBody] List<ItineraryItemReorderDto> reorderedItems)
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
				if (!Guid.TryParse(userIdClaim, out var userId))
					return Unauthorized(ApiResponse<Guid>.ErrorResultWithCode("Invalid user ID " +
						"or You don't have permission to delete this ID", errorStatusCode: 403));

				/* Check if the user has permission to edit the itinerary */
				var isOwnerResponse = await _itineraryService.CheckItineraryOwner(itineraryId, userId);

				if (!isOwnerResponse.Success)
				{
					return StatusCode(isOwnerResponse.StatusCode, isOwnerResponse);
				}


				if (reorderedItems == null)
				{
					return BadRequest(ApiResponse<string>.ErrorResultWithCode("Request body is null, please input the itinerary information", errorStatusCode: 400));
				}

				if (itineraryId == Guid.Empty)
				{
					return BadRequest(ApiResponse<string>.ErrorResultWithCode("itineraryId is required", errorStatusCode: 400));
				}

				var response = await _itineraryItemService.ReorderItineraryItemsAsync(itineraryId, reorderedItems);

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
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to reorder an itinerary item due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when reordering an itinerary item from Itinerary"
					}
				));
			}
		}
		

	}
}
