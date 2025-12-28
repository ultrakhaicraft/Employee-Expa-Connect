using Application.Interfaces;
using Infrastructure.Models.Chat;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace API.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly IChatService _chatService;
        private readonly ILogger<ChatHub> _logger;

        public ChatHub(IChatService chatService, ILogger<ChatHub> logger)
        {
            _chatService = chatService;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId();
            _logger.LogInformation($"User {userId} connected to chat hub");

            // Add user to their personal group
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var userId = GetUserId();
            _logger.LogInformation($"User {userId} disconnected from chat hub");

            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Send a message through SignalR
        /// </summary>
        public async Task SendMessage(ChatBotMessageRequestDto request)
        {
            var userId = GetUserId();

            try
            {
                // Show typing indicator to user
                await Clients.Caller.SendAsync("TypingIndicator", true);

                // Process the message
                var response = await _chatService.ProcessMessageAsync(userId, request);

                // Send response back to the caller
                await Clients.Caller.SendAsync("ReceiveMessage", response);

                // Stop typing indicator
                await Clients.Caller.SendAsync("TypingIndicator", false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing message in SignalR hub");

                await Clients.Caller.SendAsync("Error", new
                {
                    message = "Xin lỗi, có lỗi xảy ra khi xử lý tin nhắn của bạn."
                });

                await Clients.Caller.SendAsync("TypingIndicator", false);
            }
        }

        /// <summary>
        /// Join a specific conversation room
        /// </summary>
        public async Task JoinConversation(Guid conversationId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"conversation_{conversationId}");
            _logger.LogInformation($"User joined conversation {conversationId}");
        }

        /// <summary>
        /// Leave a conversation room
        /// </summary>
        public async Task LeaveConversation(Guid conversationId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conversation_{conversationId}");
            _logger.LogInformation($"User left conversation {conversationId}");
        }

        private Guid GetUserId()
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
                throw new HubException("User not authenticated");

            return Guid.Parse(userIdClaim);
        }
    }
}
