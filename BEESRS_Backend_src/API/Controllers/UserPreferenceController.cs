using Application.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Models.UserPreferenceDTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers
{
	[Route("api/[controller]")]
	[ApiController]
	public class UserPreferenceController : Controller
	{
		private readonly IUserPreferenceService _userPreferenceService;

		public UserPreferenceController(IUserPreferenceService userPreferenceService)
		{
			_userPreferenceService = userPreferenceService;
		}


		#region  additional CRUD endpoints for user preferences

		/// <summary>
		/// Get all user preferences with pagination
		/// </summary>
		/// <param name="request">ID of user preference entity</param>
		/// <returns></returns>
		/// <remarks>User</remarks>
		/// <remarks>If you want to update user avatar, please use Upload Avatar method API</remarks>
		[HttpGet]
		public async Task<IActionResult> GetAllUserPreferences([FromQuery] PagedRequest request)
		{
			var response = await _userPreferenceService.GetAllUserPreferencePagedAsync(request);
			if (response.Success)
			{
				return Ok(response);
			}
			else
			{
				return StatusCode(response.StatusCode, response);
			}

		}

		/// <summary>
		/// Lấy user preference của employee
		/// </summary>
		/// 
		[Authorize]
		[HttpGet("get-user-preference")]
		public async Task<ActionResult> GetUserPreferencesDetail()
		{
			try
			{
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var response = await _userPreferenceService.GetUserPreferenceDetailByUserId(userId);
				return Ok(response);
            }
			catch (KeyNotFoundException ex)
			{
				return NotFound(ex.Message);
			}
			catch (Exception ex)
			{
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


		/// <summary>
		/// Tạo user preference mới
		/// </summary>
		/// 
		[Authorize]		
		[HttpPost("create-user-preference")]
		public async Task<IActionResult> CreateUserPreference([FromBody] UserPreferenceCreateDto request)
		{
			try
			{
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var response = await _userPreferenceService.CreateUserPreferenceAsync(request, userId);
				return Ok(response);
            }
			catch(InvalidOperationException ex)
			{
				return BadRequest(ex.Message);
			}
			catch (Exception ex)
			{
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

		/// <summary>
		/// Cập nhật user preference của employee
		/// </summary>
		/// 
		[Authorize]		
		[HttpPut("update-user-preference")]
		public async Task<IActionResult> UpdateUserPreference([FromBody] UserPreferenceUpdateDto request)
		{
			try
			{
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var response = await _userPreferenceService.UpdateUserPreferenceAsync(request, userId);
				return Ok(response);
            }
			catch(InvalidOperationException ex)
			{
				return BadRequest(ex.Message);
			}
			catch (Exception ex)
			{
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


		/// <summary>
		/// Delete user preference based on the user preference ID
		/// </summary>
		/// <param name="preferenceId">ID of user preference entity</param>
		/// <returns></returns>
		/// <remarks>User</remarks>
		[HttpDelete("{preferenceId}")]
		public async Task<IActionResult> DeleteUserPreference([FromRoute] Guid preferenceId)
		{
			if (preferenceId == Guid.Empty)
			{
				return BadRequest(new { Message = "Please input user preference id" });
			}


			var response = await _userPreferenceService.DeleteUserPreferenceAsync(preferenceId);
			if (response.Success)
			{
				return Ok(response);
			}
			else
			{
				return StatusCode(response.StatusCode, response);
			}
		}

		#endregion
	}
}
