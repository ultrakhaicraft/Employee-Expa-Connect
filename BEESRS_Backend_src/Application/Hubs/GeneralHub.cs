using Infrastructure.Models.Common;
using Infrastructure.Models.NotificationDTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace Application.Hubs
{

	/// <summary>
	/// Manage new about data manipulation
	/// </summary>
	[Authorize]
	public class GeneralHub : Hub
	{
		private readonly ILogger<GeneralHub> _logger;

		public GeneralHub(ILogger<GeneralHub> logger)
		{
			_logger = logger;
		}

		//Handle user able to connected to the GeneralHub
		public override async Task OnConnectedAsync()
		{
			var userId = GetUserId();
			var userRole = GetUserRole();

			_logger.LogInformation($"User {userId} has been connected to General Hub as {userRole}");

			// Add the user to their role-based group
			await Groups.AddToGroupAsync(Context.ConnectionId, userRole);

			var connectionMessage = new OnConnectedMessage
			{
				Message = $"User {userId} has been connected to General Hub as {userRole}",
				CurrentUserID = userId,
				CurrentUserRole = userRole

			};

			await Clients.Caller.SendAsync("Connected", connectionMessage);

			await base.OnConnectedAsync();
		}

		// Handle action when user disconnected with connection cleanup or log
		public override async Task OnDisconnectedAsync(Exception? exception)
		{
			var userId = GetUserId();
			var userRole = GetUserRole();

			//Remove user from group
			await Groups.RemoveFromGroupAsync(Context.ConnectionId, userRole);
			_logger.LogInformation($"User {userId} with role {userRole} has been disconnected from General Hub");

			await base.OnDisconnectedAsync(exception);
		}


		/// <summary>
		/// Boardcast a notification to all user account connected to General Hub
		/// </summary>
		/// <param name="title"></param>
		/// <param name="message"></param>
		/// <param name="type"></param>
		/// <returns></returns>
		public async Task BroadcastNotification(string title, string message
			,string type = "info")
		{
			try
			{
				var senderId = GetUserId();
				var senderRole = GetUserRole();


				var notificationMessage = new GeneralNotificationMessage
				{
					Title = title,
					Message = message,
					Type = type,
					SenderId = senderId,
					SenderRole = senderRole
				};

				await Clients.All.SendAsync("ReceiveNotification", notificationMessage);
			}
			catch (Exception ex)
			{

				_logger.LogError(ex, "Error while sending BroadcastNotification notification.");
				throw new HubException("Failed to send notification to all user client" + ex.Message);
			}
		}

		/// <summary>
		/// Notify a specific user by userId
		/// </summary>
		/// <param name="targetUserId"></param>
		/// <param name="title"></param>
		/// <param name="message"></param>
		/// <param name="type"></param>
		/// <returns></returns>
		public async Task NotifyUser(Guid targetUserId, string title, string message, string type = "info")
		{
			try
			{
				var senderId = GetUserId();
				var senderRole = GetUserRole();

				var notificationMessage = new GeneralNotificationMessage
				{
					Title = title,
					Message = message,
					Type = type,
					SenderId = senderId,
					SenderRole = senderRole,
					TargetUserId = targetUserId
				};

				await Clients.User(targetUserId.ToString()).SendAsync("ReceiveNotification", notificationMessage);
			}
			catch (Exception ex)
			{

				_logger.LogError(ex, "Error while sending NotifyUser notification.");
				throw new HubException("Failed to send notification to target user." + ex.Message);
			}
		}

		/// <summary>
		/// Notify all user within a specific role
		/// </summary>
		/// <param name="targetRole"></param>
		/// <param name="title"></param>
		/// <param name="message"></param>
		/// <param name="type"></param>
		/// <returns></returns>
		public async Task NotifyRole(string targetRole, string title, string message, string type = "info")
		{
			try
			{
				var senderId = GetUserId();
				var senderRole = GetUserRole();

				var notificationMessage = new GeneralNotificationMessage
				{
					Title = title,
					Message = message,
					Type = type,
					SenderId = senderId,
					SenderRole = senderRole,
					TargetRole = targetRole
				};

				await Clients.Group(targetRole).SendAsync("ReceiveNotification", notificationMessage);
			}
			catch (Exception ex)
			{

				_logger.LogError(ex, "Error while sending NotifyRole notification.");
				throw new HubException("Failed to send notification to target role." + ex.Message);
			}
		}

		/// <summary>
		/// Test if signalR is working from Backend
		/// </summary>
		/// <param name="message"></param>
		/// <returns></returns>
		public async Task Ping(string message = "Ping from client")
		{
			var userId = GetUserId();
			await Clients.Caller.SendAsync("ReceiveNotification", new
			{
				Title = "Ping",
				Message = $"Server received: {message}",
				User = userId
			});
		}


		#region Private helper method

		//Get user ID from logged in
		private Guid GetUserId()
		{
			var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
			if (string.IsNullOrEmpty(userIdClaim))
				throw new HubException("User not authenticated");

			return Guid.Parse(userIdClaim);
		}

		//Get user role from logged in
		private string GetUserRole()
		{
			var roleClaim = Context.User?.FindFirst(ClaimTypes.Role)?.Value;
			if (string.IsNullOrEmpty(roleClaim))
				throw new HubException("User role not found");

			return roleClaim;
		}
		#endregion

	}
}
