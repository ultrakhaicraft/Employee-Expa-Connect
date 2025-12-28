using Application.Interfaces;
using Application.Interfaces.ItineraryService;
using Application.Interfaces.ThirdParty;
using Application.Services;
using AutoMapper;
using Azure;
using Domain.Entities;
using Infrastructure.Helper.Enum;
using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using Infrastructure.Models.ItineraryShareDTO;
using Infrastructure.Models.UserDTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace API.Controllers.Itinerary
{

	/// <summary>
	/// Controller for managing itineraries, sharing function and itinerary items.
	/// </summary>
	[Route("api/itinerary")]
	[ApiController]
	public class ItineraryController : Controller
	{
		private readonly IItineraryService _itineraryService;
		private readonly IItineraryShareService _itineraryShareService;
		private readonly IAIService _aiService;
		private readonly IImageGenerationService _imageGenerationService;
		private readonly ICloudinaryHelper _cloudinaryHelper;

		public ItineraryController(
			IItineraryService itineraryService, 
			IItineraryShareService itineraryShareService,
			IAIService aiService,
			IImageGenerationService imageGenerationService,
			ICloudinaryHelper cloudinaryHelper)
		{
			_itineraryService = itineraryService;
			_itineraryShareService = itineraryShareService;
			_aiService = aiService;
			_imageGenerationService = imageGenerationService;
			_cloudinaryHelper = cloudinaryHelper;
		}

		/// <summary>
		/// Create a new itinerary entity along with its associated itinerary items if it exists (User role) 
		/// </summary>
		/// <param name="request"></param>
		/// <returns></returns>
		/// <remarks>Must be authenticated to create an itinerary (Get userId from token) IsTemplate will always set to false</remarks>
		[HttpPost("create-new")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> CreateItinerary([FromBody] ItineraryCreateNewDto request)
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

				if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
				{
					return BadRequest(ApiResponse<UserInfoDto>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
				}

				if (request == null)
				{
					return BadRequest(ApiResponse<string>.ErrorResultWithCode("Request body is null, please input the itinerary information", errorStatusCode: 400));
				}

				if (!ModelState.IsValid)
				{
					return BadRequest(ModelState);
				}

				var response = await _itineraryService.CreateNewAsync(request, userId);
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
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to create new itinerary due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when creating new Itinerary"
					}
				));
			}
		}

		/// <summary>
		/// Create a new itinerary entity along with its associated itinerary items if it exists (User role) then Save As Template
		/// </summary>
		/// <param name="request"></param>
		/// <returns></returns>
		/// <remarks>Must be authenticated to create an itinerary (Get userId from token), IsTemplate will always set to true
		/// and User can </remarks>
		[HttpPost("create-as-template")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> CreateItineraryAsTemplate([FromBody] ItineraryCreateAsTemplateDto request)
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

				if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
				{
					return BadRequest(ApiResponse<UserInfoDto>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
				}

				if (request == null)
				{
					return BadRequest(ApiResponse<string>.ErrorResultWithCode("Request body is null, please input the itinerary information", errorStatusCode: 400));
				}

				if (!ModelState.IsValid)
				{
					return BadRequest(ModelState);
				}

				var response = await _itineraryService.CreateAsTemplateAsync(request, userId);
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
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to create itinerary template due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when creating Itinerary as template"
					}
				));
			}
		}

		/// <summary>
		/// Get itinerary detail by Id, include itinerary items of that itinerary if it exist (User role)
		/// </summary>
		/// <param name="itineraryId">ID of the Itinerary</param>
		/// <returns></returns>
		[HttpGet("detail/{itineraryId}")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> GetItineraryDetailById([FromRoute] Guid itineraryId)
		{
			try
			{
				if (itineraryId == Guid.Empty)
				{
					return BadRequest(ApiResponse<ItineraryDetailDto>.ErrorResultWithCode("ItineraryId is required", errorStatusCode: 400));
				}

				var result = await _itineraryService.GetItineraryDetailByIdAsync(itineraryId);

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
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to get itinerary detail due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when getting Itinerary detail"
					}
				));
			}
		}

		/// <summary>
		/// Get all itineraries by user Id with pagination, search and filter included (User role)
		/// </summary>
		/// <param name="request"></param>
		/// <param name="userId"></param>
		/// <remarks>Search Based on Title, Filter based on Trip Type/Destination Country</remarks>
		/// <returns></returns>
		[HttpGet("search-all")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> GetAllItinerary([FromQuery] ItineraryPagedRequest request)
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

				if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
				{
					return BadRequest(ApiResponse<UserInfoDto>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
				}

				var result = await _itineraryService.SearchAllPagedByUserId(request, userId);

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
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to get all itinerary due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught during getting all Itinerary"
					}
				));
			}
		}

		/// <summary>
		/// Delete an existing itinerary based on itinerary Id, This will also delete all the itinerary items associated with that itinerary (User role)
		/// </summary>
		/// <param name="itineraryId">ID of the itinerary</param>
		/// <returns></returns>
		/// <remarks>Reason for deleting itinerary items is due to cascading</remarks>
		[HttpDelete("delete-itinerary/{itineraryId}")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> DeleteItinerary([FromRoute] Guid itineraryId)
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
				if (!Guid.TryParse(userIdClaim, out var userId))
					return Unauthorized(ApiResponse<Guid>.ErrorResultWithCode("Invalid user ID " +
						"or You don't have permission to delete this ID", errorStatusCode: 401));

				/* Check if the user has permission to delete the itinerary */
				var checkOwnerResponse = await _itineraryService.CheckItineraryOwner(itineraryId, userId);
				if (!checkOwnerResponse.Success)
				{
					return StatusCode(checkOwnerResponse.StatusCode, checkOwnerResponse);
				}

				if (itineraryId == Guid.Empty)
				{
					return BadRequest(ApiResponse<string>.ErrorResultWithCode("itineraryId is required", errorStatusCode: 400));
				}
				var response = await _itineraryService.DeleteItineraryByIdAsync(itineraryId, userId);
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
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to delete itinerary due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught during deleting Itinerary"
					}
				));
			}
		}

		/// <summary>
		/// Update an existing itinerary based on itinerary Id, this does not update itinerary items
		/// </summary>
		/// <param name="itineraryId">ID of the itinerary</param>
		/// <param name="request">Update request body for itinerary, must not contain itinerary items</param>
		/// <returns></returns>
		[HttpPut("update-itinerary/{itineraryId}")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> UpdateItinerary([FromBody] ItineraryUpdateDto request, [FromRoute] Guid itineraryId)
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
				if (!Guid.TryParse(userIdClaim, out var userId))
					return Unauthorized(ApiResponse<Guid>.ErrorResultWithCode("Invalid user ID " +
						"or You don't have permission to update this ID", errorStatusCode: 403));

				/* Check if the user has permission to edit the itinerary */
				var isOwnerResponse = await _itineraryService.CheckItineraryOwner(itineraryId, userId);

				if (!isOwnerResponse.Success)
				{
					return StatusCode(isOwnerResponse.StatusCode, isOwnerResponse);
				}


				if (request == null)
				{
					return BadRequest(ApiResponse<string>.ErrorResultWithCode("Request body is null, please input the itinerary information", errorStatusCode: 400));
				}

				if (itineraryId == Guid.Empty)
				{
					return BadRequest(ApiResponse<string>.ErrorResultWithCode("itineraryId is required", errorStatusCode: 400));
				}

				if (!ModelState.IsValid)
				{
					return BadRequest(ModelState);
				}

				var response = await _itineraryService.UpdateItineraryAsync(itineraryId, request, userId);
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
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to update itinerary due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught during update Itinerary"
					}
				));
			}
		}

		/// <summary>
		/// Set an existing itinerary as template based on itinerary Id (User role)
		/// </summary>
		/// <param name="itineraryId">Id of the Itinerary</param>
		/// <returns></returns>
		[HttpPost("{itineraryId}/save-as-template")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> SaveAsTemplate([FromRoute] Guid itineraryId)
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
				if (!Guid.TryParse(userIdClaim, out var userId))
					return Unauthorized(ApiResponse<Guid>.ErrorResultWithCode("Invalid user ID " +
						"or You don't have permission to update this ID", errorStatusCode: 403));

				/* Check if the user has permission to edit the itinerary */
				var isOwnerResponse = await _itineraryService.CheckItineraryOwner(itineraryId, userId);

				if (!isOwnerResponse.Success)
				{
					return StatusCode(isOwnerResponse.StatusCode, isOwnerResponse);
				}

				if (itineraryId == null)
				{
					return BadRequest(ApiResponse<string>.ErrorResultWithCode("itinerary Id input is empty, please try again", errorStatusCode: 400));
				}

				if (!ModelState.IsValid)
				{
					return BadRequest(ModelState);
				}

				var response = await _itineraryService.SaveAsTemplate(itineraryId);
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
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to save itinerary as template due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when saving itinerary as template"
					}
				));
			}
		}

		/// <summary>
		/// Get all the itinerary of the current authenticated user with pagination (User role)
		/// </summary>
		/// <param name="request"></param>		
		/// <remarks>Used for check user itinerary history</remarks>
		/// <returns></returns>
		[HttpGet("get-all-current-user")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> GetItinerariesByCurrentUser([FromQuery] ItineraryPagedRequest request)
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

				if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
				{
					return BadRequest(ApiResponse<UserInfoDto>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
				}

				var result = await _itineraryService.GetAllPagedByUserAsync(request, userId);

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
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to get itineraries by current user due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when getting itineraries by current user"
					}
				));
			}
		}


		/// <summary>
		/// Duplicate an existing itinerary based on itinerary Id, along with its associated itinerary items if it exist (User role)
		/// </summary>
		/// <param name="existingItineraryId"></param>
		/// <returns></returns>
		[HttpPost("{existingItineraryId}/duplicate")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> DuplicateNewItineraryById([FromRoute] Guid existingItineraryId)
		{


			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
				if (!Guid.TryParse(userIdClaim, out var userId))
					return Unauthorized(ApiResponse<Guid>.ErrorResultWithCode("Invalid user ID " +
						"or You don't have permission to duplicate this ID", errorStatusCode: 403));

				/* Check if the user has permission to edit the itinerary */
				var isOwnerResponse = await _itineraryService.CheckItineraryOwner(existingItineraryId, userId);
				if (!isOwnerResponse.Success)
				{
					return StatusCode(isOwnerResponse.StatusCode, isOwnerResponse);
				}


				var result = await _itineraryService.DuplicateItineraryAsync(userId, existingItineraryId);

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
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to duplicate itineraries due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when duplicating itineraries by current user"
					}
				));
			}
		}



		/// <summary>
		/// Upload a singular image file for the itinerary specified by ItineraryId (User role)
		/// </summary>
		/// <param name="ItineraryId"></param>
		/// <param name="imageFile"></param>
		/// <returns></returns>
		[HttpPatch("{ItineraryId}/upload-image")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> UploadItineraryImage([FromRoute] Guid ItineraryId, IFormFile imageFile)
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
				if (!Guid.TryParse(userIdClaim, out var userId))
					return Unauthorized(ApiResponse<Guid>.ErrorResultWithCode("Invalid user ID " +
						"or You don't have permission to update this ID", errorStatusCode: 403));

				/* Check if the user has permission to edit the itinerary */
				var isOwnerResponse = await _itineraryService.CheckItineraryOwner(ItineraryId, userId);

				if (!isOwnerResponse.Success)
				{

					return StatusCode(isOwnerResponse.StatusCode, isOwnerResponse);

				}

				if (imageFile == null || imageFile.Length == 0)
				{
					return BadRequest(new { Message = "No file uploaded." });
				}
				var response = await _itineraryService.AddImageAsync(ItineraryId, imageFile, userId);
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
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to upload itinerary image due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when uploading itinerary image"
					}
				));
			}
		}

		/// <summary>
		/// Generate a cover image for itinerary using AI (User role)
		/// </summary>
		/// <param name="request">Itinerary data to generate image from</param>
		/// <returns>URL of the generated and uploaded image</returns>
		[HttpPost("generate-cover-image")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> GenerateCoverImage([FromBody] ItineraryImageGenerationRequest request)
		{
			var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
			if (!Guid.TryParse(userIdClaim, out var userId))
			{
				return Unauthorized(ApiResponse<string>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 403));
			}

			if (request == null)
			{
				return BadRequest(ApiResponse<string>.ErrorResultWithCode("Request body is required", errorStatusCode: 400));
			}

			try
			{
				// Step 1: Generate image prompt using Groq
				var prompt = await _aiService.GenerateImagePromptAsync(
					request.Title,
					request.Description ?? "",
					request.TripType ?? "Leisure",
					request.DestinationCity ?? "",
					request.DestinationCountry ?? ""
				);

				// Step 2: Generate image using image generation service
				var imageBytes = await _imageGenerationService.GenerateImageAsync(prompt);

				// Step 3: Upload to Cloudinary
				var fileName = $"itinerary-{Guid.NewGuid()}.jpg";
				var uploadResult = await _cloudinaryHelper.UploadImageFromBytesAsync(imageBytes, fileName, "itineraries");

				if (!uploadResult.IsSuccess)
				{
					return StatusCode(500, ApiResponse<string>.ErrorResultWithCode(
						uploadResult.ErrorMessage ?? "Failed to upload generated image", errorStatusCode: 500));
				}

				return Ok(ApiResponse<string>.SuccessResult(uploadResult.FileUrl));
			}
			catch (Exception ex)
			{
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode(
					$"Error generating image: {ex.Message}", errorStatusCode: 500));
			}
		}

	}
}

/// <summary>
/// Request model for generating itinerary cover image
/// </summary>
public class ItineraryImageGenerationRequest
{
	public string Title { get; set; } = string.Empty;
	public string? Description { get; set; }
	public string? TripType { get; set; }
	public string? DestinationCity { get; set; }
	public string? DestinationCountry { get; set; }
}
