using Application.Interfaces.ItineraryService;
using Infrastructure.Helper.Enum;
using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers.Itinerary
{
	[Route("api/itinerary-templates")]
	public class ItineraryTemplateController : Controller
	{
		private readonly IItineraryService _itineraryService;
		private readonly IItineraryTemplateService _itineraryTemplateService;

		public ItineraryTemplateController(IItineraryService itineraryService, IItineraryTemplateService itineraryTemplateService)
		{
			_itineraryService = itineraryService;
			_itineraryTemplateService = itineraryTemplateService;
		}

		/// <summary>
		/// Convert itinerary into a template version (User role)
		/// </summary>
		/// <param name="itineraryId"></param>
		/// <param name="itineraryCategory"></param>
		/// <returns></returns>
		/// <remarks>Assuming that no need for checking edit permission</remarks>
		[HttpPost("{itineraryId}/save-as-template")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> SaveAsTemplate(Guid itineraryId, [FromForm] string? itineraryCategory = null)
		{

			try
			{
				var result = await _itineraryTemplateService.ConvertToTemplateAsync(itineraryId, itineraryCategory);
				if (!result.Success)
				{
					return StatusCode(result.StatusCode, result);
				}

				return Ok(result);
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to save itinerary as template due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when saving itinerar asy template"
					}
				));
			}
		}


		/// <summary>
		/// Get all public itinerary templates (User role)
		/// </summary>
		/// <param name="request"></param>
		/// <returns></returns>
		[HttpGet]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetPublicTemplates([FromQuery] ItineraryPagedRequest request)
		{
			try
			{
				if (request == null)
				{
					return BadRequest(ApiResponse<bool>.ErrorResultWithCode("Request body is null, please input the itinerary information", errorStatusCode: 400));
				}

				var result = await _itineraryTemplateService.GetPublicTemplatesAsync(request);
				if (!result.Success)
				{
					return StatusCode(result.StatusCode, result);
				}

				return Ok(result);
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to get all public itinerary template due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when getting all public itinerary template"
					}
				));
			}
		}

		/// <summary>
		/// Get templates created by the current user (User role)
		/// </summary>
		/// <param name="request"></param>
		/// <returns></returns>
		[HttpGet("my")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetMyTemplates([FromQuery] ItineraryPagedRequest request)
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

				if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
				{
					return BadRequest(ApiResponse<bool>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
				}

				var result = await _itineraryTemplateService.GetMyTemplatesAsync(request, userId);
				if (!result.Success)
				{
					return StatusCode(result.StatusCode, result);
				}

				return Ok(result);
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to get my itinerary template due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when getting my itinerary template"
					}
				));
			}
		}
	}
}
