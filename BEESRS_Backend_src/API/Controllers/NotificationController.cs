using Application.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers
{
	[Route("api/notifications")]
	[ApiController]
	public class NotificationController : Controller
	{
		private readonly INotificationService _notificationService;

		public NotificationController(INotificationService notificationService)
		{
			this._notificationService = notificationService;
		}

		/// <summary>
		/// Get all notifcation for current user (any role)
		/// </summary>
		/// <returns></returns>
		[HttpGet("get-all")]
		//[Authorize(Roles = "User")]
		[Authorize]
		public async Task<ActionResult> GetNotificationsByUser([FromQuery] PagedRequest request)
		{
			var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

			if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
			{
				return BadRequest(ApiResponse<string>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
			}

			var response = await _notificationService.GetAllNotificationViewAsync(userId, request);
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
		/// Get notification detail by Id (any role)
		/// </summary>
		/// <param name="notificationId"></param>
		/// <returns></returns>
		[HttpGet("get-detail")]
		//[Authorize(Roles = "User")]
		[Authorize]
		public async Task<ActionResult> GetNotificationDetail([FromQuery] Guid notificationId)
		{
			var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

			if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
			{
				return BadRequest(ApiResponse<string>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
			}

			var response = await _notificationService.GetNotificationDetailByIdAsync(notificationId);
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
		/// Mark notification as read (any role)
		/// </summary>
		/// <param name="notificationId"></param>
		/// <returns></returns>
		[HttpPatch("mark-as-read")]
		//[Authorize(Roles = "User")]
		[Authorize]
		public async Task<ActionResult> MarkAsRead([FromQuery] Guid notificationId)
		{
			var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

			if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
			{
				return BadRequest(ApiResponse<string>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
			}

			var response = await _notificationService.MarkNotificationAsReadAsync(notificationId);
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
		/// Dimiss a notification (any role)
		/// </summary>
		/// <param name="notificationId"></param>
		/// <returns></returns>
		[HttpPatch("mark-as-dimissed")]
		//[Authorize(Roles = "User")]
		[Authorize]
		public async Task<ActionResult> MarkAsDismissed([FromQuery] Guid notificationId)
		{
			var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

			if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
			{
				return BadRequest(ApiResponse<string>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
			}

			var response = await _notificationService.MarkNotificationAsDismissedAsync(notificationId);
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
		/// Delete the notification  (any role)
		/// </summary>
		/// <param name="notificationId"></param>
		/// <returns></returns>
		[HttpDelete()]
		//[Authorize(Roles = "User")]
		[Authorize]
		public async Task<ActionResult> DeleteNotification([FromQuery] Guid notificationId)
		{
			var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

			if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
			{
				return BadRequest(ApiResponse<string>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
			}

			var response = await _notificationService.DeleteNotificationAsync(notificationId, userId);
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
		/// Get unread notification count for current user
		/// </summary>
		/// <returns></returns>
		[HttpGet("unread-count")]
		[Authorize]
		public async Task<ActionResult> GetUnreadCount()
		{
			var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

			if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
			{
				return BadRequest(ApiResponse<string>.ErrorResultWithCode("Invalid user ID", errorStatusCode: 400));
			}

			var response = await _notificationService.GetUnreadCountAsync(userId);
			if (response.Success)
			{
				return Ok(response);
			}
			else
			{
				return StatusCode(response.StatusCode, response);
			}
		}
	}
}
