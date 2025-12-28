using Application.Interfaces;
using Application.Services;
using Infrastructure.Models.Common;
using Infrastructure.Models.UserDTO;
using Infrastructure.Models.UserLocationDTO;
using Infrastructure.Models.UserPreferenceDTO;
using Infrastructure.Models.UserProfileDTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Collections.Generic;
using System.Linq;

namespace API.Controllers
{

	/// <summary>
	/// Manage operation related to the user and their profile. Like viewing and updating profile information, managing user settings, etc.
	/// </summary>
	[Route("api/[controller]")]
	[ApiController]
	public class UserController : Controller
	{
		private readonly IUserService _userService;
		

		public UserController(IUserService userService)
		{
			_userService = userService;
			
		}



		/// <summary>
		/// Get current user information
		/// </summary>
		[HttpGet("profile")]
		[Authorize]
		public async Task<ActionResult<ApiResponse<UserInfoDto>>> GetCurrentUser()
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

				if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
				{
					return BadRequest(ApiResponse<UserInfoDto>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
				}

				var result = await _userService.GetCurrentUserAsync(userId);

				if (!result.Success)
				{
					return BadRequest(result);
				}

				return Ok(result);
			}
			catch (Exception ex)
			{

				return StatusCode(
					StatusCodes.Status500InternalServerError,
					ApiResponse<UserInfoDto>.ErrorResult(
						"An unexpected error occurred while retrieving user profile",
						new List<string> { ex.Message }
					)
				);
			}
		}

		/// <summary>
		/// Update an existing user and user profile based on user Id
		/// </summary>
		/// <param name="request">user and user profile information to be updated</param>
		/// <param name="userId">ID of user profile entity</param>
		/// <remarks>User</remarks>
		/// <returns></returns>
		[HttpPut("update-profile/{userId}")]
		[Authorize]
		public async Task<IActionResult> UpdateUserAndUserProfile([FromBody] UserAndUserProfileUpdateDto request, [FromRoute] Guid userId)
		{

			try
			{
				if (request == null || userId == Guid.Empty)
				{
					return BadRequest(new
					{ Message = "Request body is null or userId is empty, please input both user profile and id information" });
				}

				if (!ModelState.IsValid)
				{
					return BadRequest(ModelState);
				}

				var response = await _userService.UpdateUserAndUserProfileAsync(request, userId);
				if (response.Success)
				{
					return Ok(response);
				}
				else
				{
					return StatusCode(response.StatusCode, response);
				}
			}
			catch (Exception ex)
			{

				return StatusCode(
					StatusCodes.Status500InternalServerError,
					ApiResponse<string>.ErrorResult(
						"An unexpected error occurred while retrieving user profile",
						new List<string> { ex.Message }
					)
				);
			}
		}

		#region additional CRUD endpoints for user profiles

		/// <summary>
		/// Upload or update user avatar image based on the user ID
		/// </summary>
		/// <param name="profileId">ID of user entity</param>
		/// <param name="imageFile">Image file of avatar</param>
		/// <returns></returns>
		/// <remarks>User</remarks>
		/// <remarks>Only support uploading single image file</remarks>
		[HttpPatch("profiles/{userId}/avatar")]
		[Authorize]
		public async Task<IActionResult> UploadUserAvatar([FromRoute] Guid userId, IFormFile imageFile)
		{
			try
			{
				if (imageFile == null || imageFile.Length == 0)
				{
					return BadRequest(new { Message = "No file uploaded." });
				}
				var response = await _userService.AddUserAvatarAsync(userId, imageFile);
				if (response.Success)
				{
					return Ok(response);
				}
				else
				{
					return StatusCode(response.StatusCode, response);
				}
			}
			catch (Exception ex)
			{

				return StatusCode(
					StatusCodes.Status500InternalServerError,
					ApiResponse<string>.ErrorResult(
						"An unexpected error occurred while retrieving user profile",
						new List<string> { ex.Message }
					)
				);
			}
		}

		/// <summary>
		/// Get all user profiles with pagination
		/// </summary>
		/// <param name="request">request for page number, page size</param>
		/// <returns></returns>
		/// <remarks>User</remarks>
		/// <remarks>Does not support searching</remarks>
		[HttpGet("profiles")]
		[Authorize]
		public async Task<IActionResult> GetAllUserProfile([FromQuery] PagedRequest request)
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

				if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
				{
					return BadRequest(ApiResponse<UserInfoDto>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
				}

				var response = await _userService.GetAllUserProfilesPagedAsync(request, userId);
				if (response.Success)
				{
					return Ok(response);
				}
				else
				{
					return StatusCode(response.StatusCode, response);
				}
			}
			catch (Exception ex)
			{

				return StatusCode(
					StatusCodes.Status500InternalServerError,
					ApiResponse<UserInfoDto>.ErrorResult(
						"An unexpected error occurred while retrieving user profile",
						new List<string> { ex.Message }
					)
				);
			}

		}


		/// <summary>
		/// Xem profile của người khác (Any role)
		/// </summary>
		/// <param name="otherUserId">ID of other user profile entity</param>
		/// <remarks>User</remarks>
		/// <returns></returns>
		[HttpGet("profiles/other/{otherUserId}")]
		[Authorize]
		public async Task<IActionResult> GetUserProfileDetail([FromRoute] Guid otherUserId)
		{
			try
			{
				if (otherUserId == Guid.Empty)
				{
					return BadRequest(new { Message = "userId is empty, please input the id" });
				}

				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

				if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
				{
					return BadRequest(ApiResponse<UserInfoDto>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
				}

				var response = await _userService.GetOtherUserProfileDetailByUserId(otherUserId, userId);
				if (response.Success)
				{
					return Ok(response);
				}
				else
				{
					return StatusCode(response.StatusCode, response);
				}
			}
			catch (Exception ex)
			{

				return StatusCode(
					StatusCodes.Status500InternalServerError,
					ApiResponse<UserInfoDto>.ErrorResult(
						"An unexpected error occurred while retrieving user profile",
						new List<string> { ex.Message }
					)
				);
			}

		}


		/// <summary>
		/// Create a new user profile
		/// </summary>
		/// <param name="request">user profile information to be created</param>
		/// <returns></returns>
		/// <remarks>User</remarks>
		/// <remarks>If you want to update user avatar, please use Upload Avatar method API</remarks>
		[HttpPost("profiles")]
		[Authorize]
		public async Task<IActionResult> CreateUserProfile([FromBody] UserProfileCreateDto request)
		{
			try
			{
				if (request == null)
				{
					return BadRequest(new { Message = "Request body is null, please input the user profile information" });
				}

				if (!ModelState.IsValid)
				{
					return BadRequest(ModelState);
				}

				var response = await _userService.CreateUserProfileAsync(request);
				if (response.Success)
				{
					return Ok(response);
				}
				else
				{
					return StatusCode(response.StatusCode, response);
				}
			}
			catch (Exception ex)
			{

				return StatusCode(
					StatusCodes.Status500InternalServerError,
					ApiResponse<string>.ErrorResult(
						"An unexpected error occurred while retrieving user profile",
						new List<string> { ex.Message }
					)
				);
			}
		}


		/// <summary>
		/// Update an existing user profile by its ID
		/// </summary>
		/// <param name="request">user profile information to be updated</param>
		/// <param name="profileId">ID of user profile entity</param>
		/// <remarks>User</remarks>
		/// <returns></returns>
		[HttpPut("profiles/{profileId}")]
		[Authorize]
		public async Task<IActionResult> UpdateUserProfile([FromBody] UserProfileUpdateDto request, [FromRoute] Guid profileId)
		{
			try
			{
				if (request == null || profileId == Guid.Empty)
				{
					return BadRequest(new { Message = "Request body is null or ProfileId is empty, please input both user profile and id information" });
				}

				if (!ModelState.IsValid)
				{
					return BadRequest(ModelState);
				}

				var response = await _userService.UpdateUserProfileAsync(request, profileId);
				if (response.Success)
				{
					return Ok(response);
				}
				else
				{
					return StatusCode(response.StatusCode, response);
				}
			}
			catch (Exception ex)
			{

				return StatusCode(
					StatusCodes.Status500InternalServerError,
					ApiResponse<string>.ErrorResult(
						"An unexpected error occurred while retrieving user profile",
						new List<string> { ex.Message }
					)
				);
			}
		}


		/// <summary>
		/// Delete a user profile by its ID
		/// </summary>
		/// <param name="profileId">ID of user profile entity</param>
		/// <remarks>User</remarks>
		/// <returns></returns>
		[HttpDelete("profiles/{profileId}")]
		[Authorize]
		public async Task<IActionResult> DeleteUserProfile([FromRoute] Guid profileId)
		{
			try
			{
				if (profileId == Guid.Empty)
				{
					return BadRequest(new { Message = "Please input user profile id" });
				}
				var response = await _userService.DeleteUserProfileAsync(profileId);
				if (response.Success)
				{
					return Ok(response);
				}
				else
				{
					return StatusCode(response.StatusCode, response);
				}
			}
			catch (Exception ex)
			{

				return StatusCode(
					StatusCodes.Status500InternalServerError,
					ApiResponse<string>.ErrorResult(
						"An unexpected error occurred while retrieving user profile",
						new List<string> { ex.Message }
					)
				);
			}
		}

		#endregion

		/// <summary>
		/// Search users by email or display name (same branch, active users only)
		/// </summary>
		/// <param name="query">Search query (email or name)</param>
		/// <returns>List of matching users</returns>
		/// <remarks>User</remarks>
		[HttpGet("search")]
		[Authorize]
		public async Task<IActionResult> SearchUsers([FromQuery] string query)
		{
			try
			{
				var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

				if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
				{
					return BadRequest(ApiResponse<List<UserSearchResultDto>>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
				}

				if (string.IsNullOrWhiteSpace(query))
				{
					return Ok(ApiResponse<List<UserSearchResultDto>>.SuccessResult(new List<UserSearchResultDto>()));
				}

				var response = await _userService.SearchUsersAsync(query, userId);
				if (response.Success)
				{
					return Ok(response);
				}
				else
				{
					return StatusCode(response.StatusCode, response);
				}
			}
			catch (Exception ex)
			{
				return StatusCode(
					StatusCodes.Status500InternalServerError,
					ApiResponse<List<UserSearchResultDto>>.ErrorResult(
						"An unexpected error occurred while searching users",
						new List<string> { ex.Message }
					)
				);
			}
		}

		

		

	}
}
