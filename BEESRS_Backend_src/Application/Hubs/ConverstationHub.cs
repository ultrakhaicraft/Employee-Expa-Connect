using Application.Interfaces;
using Infrastructure.Models.Converstation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Application.Hubs
{
    [Authorize]
    public class ConverstationHub : Hub
    {
        private readonly IConverstationService _chatService;
        private readonly ILogger<ConverstationHub> _logger;

        public ConverstationHub(
            IConverstationService chatService,
            ILogger<ConverstationHub> logger)
        {
            _chatService = chatService;
            _logger = logger;
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("User not authenticated");
            }
            return userId;
        }

        public override async Task OnConnectedAsync()
        {
            try
            {
                var userId = GetCurrentUserId();

                // Add user to their personal group
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");

                _logger.LogInformation($"✅ User {userId} connected with connection {Context.ConnectionId}");

                // TODO: Update user online status

                await base.OnConnectedAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error in OnConnectedAsync");
                throw;
            }
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            try
            {
                var userId = GetCurrentUserId();

                // Remove user from their personal group
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");

                _logger.LogInformation($"👋 User {userId} disconnected");

                // TODO: Update user offline status

                await base.OnDisconnectedAsync(exception);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error in OnDisconnectedAsync");
            }
        }

        // Join conversation room
        public async Task JoinConversation(Guid conversationId)
        {
            try
            {
                var userId = GetCurrentUserId();

                _logger.LogInformation($"🔄 User {userId} attempting to join conversation {conversationId}");

                // Verify user is participant
                var conversation = await _chatService.GetConversationByIdAsync(conversationId, userId);
                if (conversation != null)
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, $"conversation_{conversationId}");
                    _logger.LogInformation($"✅ User {userId} joined conversation {conversationId}");
                }
                else
                {
                    _logger.LogWarning($"⚠️ Conversation {conversationId} not found or user {userId} not a participant");
                }
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, $"⚠️ Unauthorized: User trying to join conversation {conversationId}");
                await Clients.Caller.SendAsync("Error", "You are not authorized to join this conversation");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error joining conversation {conversationId}");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }

        // Leave conversation room
        public async Task LeaveConversation(Guid conversationId)
        {
            try
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conversation_{conversationId}");
                _logger.LogInformation($"👋 User left conversation {conversationId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error leaving conversation {conversationId}");
            }
        }

        // Send message via SignalR
        public async Task SendMessage(SendMessageDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();

                // Validate DTO
                if (dto == null)
                {
                    _logger.LogWarning("⚠️ SendMessage received null DTO");
                    throw new ArgumentNullException(nameof(dto), "Message data is required");
                }

                if (dto.ConversationId == Guid.Empty)
                {
                    _logger.LogWarning("⚠️ SendMessage received empty ConversationId");
                    throw new ArgumentException("ConversationId is required", nameof(dto.ConversationId));
                }

                if (string.IsNullOrWhiteSpace(dto.MessageType))
                {
                    _logger.LogWarning("⚠️ SendMessage received empty MessageType");
                    throw new ArgumentException("MessageType is required", nameof(dto.MessageType));
                }

                _logger.LogInformation($"📤 User {userId} sending message to conversation {dto.ConversationId}");

                var message = await _chatService.SendMessageAsync(userId, dto);

                // Broadcast to conversation group
                await Clients.Group($"conversation_{dto.ConversationId}")
                    .SendAsync("ReceiveMessage", message);

                _logger.LogInformation($"✅ Message {message.MessageId} sent successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "⚠️ Unauthorized access in SendMessage");
                await Clients.Caller.SendAsync("Error", $"Unauthorized: {ex.Message}");
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "⚠️ Validation error in SendMessage");
                await Clients.Caller.SendAsync("Error", $"Validation error: {ex.Message}");
            }
            catch (Exception ex)
            {
                var innerException = ex.InnerException?.Message ?? "No inner exception";
                var stackTrace = ex.StackTrace;

                _logger.LogError(ex, $"❌ Error in SendMessage");
                _logger.LogError($"❌ Inner Exception: {innerException}");
                _logger.LogError($"❌ Stack Trace: {stackTrace}");

                // Send detailed error to caller for debugging
                await Clients.Caller.SendAsync("Error", $"{ex.Message} | Inner: {innerException}");
            }
        }

        // Typing indicator
        public async Task Typing(Guid conversationId, bool isTyping)
        {
            try
            {
                var userId = GetCurrentUserId();

                if (conversationId == Guid.Empty)
                {
                    throw new ArgumentException("ConversationId is required");
                }

                await _chatService.UpdateTypingStatusAsync(conversationId, userId, isTyping);

                // Broadcast to conversation group (except sender)
                await Clients.OthersInGroup($"conversation_{conversationId}")
                    .SendAsync("UserTyping", conversationId, userId, isTyping);

                _logger.LogDebug($"💬 User {userId} typing status: {isTyping} in conversation {conversationId}");
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, $"⚠️ Unauthorized typing status update");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error in Typing for conversation {conversationId}");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }

        // Mark message as read
        public async Task MarkAsRead(Guid conversationId, Guid? messageId = null)
        {
            try
            {
                var userId = GetCurrentUserId();

                if (conversationId == Guid.Empty)
                {
                    throw new ArgumentException("ConversationId is required");
                }

                if (messageId.HasValue)
                {
                    await _chatService.MarkMessageAsReadAsync(messageId.Value, userId);
                    _logger.LogDebug($"✅ User {userId} marked message {messageId} as read");
                }
                else
                {
                    await _chatService.MarkConversationAsReadAsync(conversationId, userId);
                    _logger.LogDebug($"✅ User {userId} marked conversation {conversationId} as read");
                }

                // Notify conversation members
                await Clients.OthersInGroup($"conversation_{conversationId}")
                    .SendAsync("MessageRead", conversationId, messageId, userId);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "⚠️ Unauthorized mark as read");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error in MarkAsRead for conversation {conversationId}");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }

        // Edit message
        public async Task EditMessage(EditMessageDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();

                if (dto == null)
                {
                    throw new ArgumentNullException(nameof(dto), "Edit data is required");
                }

                if (dto.MessageId == Guid.Empty)
                {
                    throw new ArgumentException("MessageId is required");
                }

                if (string.IsNullOrWhiteSpace(dto.MessageContent))
                {
                    throw new ArgumentException("MessageContent is required");
                }

                _logger.LogInformation($"✏️ User {userId} editing message {dto.MessageId}");

                var message = await _chatService.EditMessageAsync(userId, dto);

                // Broadcast to conversation group
                await Clients.Group($"conversation_{message.ConversationId}")
                    .SendAsync("MessageEdited", message);

                _logger.LogInformation($"✅ Message {dto.MessageId} edited successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "⚠️ Unauthorized edit attempt");
                await Clients.Caller.SendAsync("Error", $"Unauthorized: {ex.Message}");
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, $"⚠️ Message not found for edit");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "⚠️ Invalid edit operation");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error in EditMessage");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }

        // Delete message
        public async Task DeleteMessage(Guid messageId, Guid conversationId)
        {
            try
            {
                var userId = GetCurrentUserId();

                if (messageId == Guid.Empty)
                {
                    throw new ArgumentException("MessageId is required");
                }

                if (conversationId == Guid.Empty)
                {
                    throw new ArgumentException("ConversationId is required");
                }

                _logger.LogInformation($"🗑️ User {userId} deleting message {messageId}");

                await _chatService.DeleteMessageAsync(messageId, userId);

                // Broadcast to conversation group
                await Clients.Group($"conversation_{conversationId}")
                    .SendAsync("MessageDeleted", conversationId, messageId);

                _logger.LogInformation($"✅ Message {messageId} deleted successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "⚠️ Unauthorized delete attempt");
                await Clients.Caller.SendAsync("Error", $"Unauthorized: {ex.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error in DeleteMessage");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }

        #region Video Call Methods

        /// <summary>
        /// Start a video call - notify the other user
        /// </summary>
        public async Task StartVideoCall(Guid conversationId, Guid toUserId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                if (conversationId == Guid.Empty)
                {
                    throw new ArgumentException("ConversationId is required");
                }

                if (toUserId == Guid.Empty)
                {
                    throw new ArgumentException("ToUserId is required");
                }

                // Verify user is participant in conversation
                var conversation = await _chatService.GetConversationByIdAsync(conversationId, currentUserId);
                if (conversation == null)
                {
                    throw new UnauthorizedAccessException("You are not a participant of this conversation");
                }

                // Get current user name
                var currentUserName = Context.User?.Identity?.Name ?? "User";

                _logger.LogInformation($"📞 User {currentUserId} starting video call to {toUserId} in conversation {conversationId}");

                // Send incoming call notification to target user
                await Clients.User(toUserId.ToString())
                    .SendAsync("VideoCallIncoming", currentUserId.ToString(), currentUserName);

                _logger.LogInformation($"✅ Video call notification sent to user {toUserId}");
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "⚠️ Unauthorized video call attempt");
                await Clients.Caller.SendAsync("Error", $"Unauthorized: {ex.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error in StartVideoCall");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }

        /// <summary>
        /// Send WebRTC offer for video call
        /// </summary>
        public async Task SendVideoCallOffer(Guid conversationId, Guid toUserId, object offer)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                if (conversationId == Guid.Empty || toUserId == Guid.Empty)
                {
                    throw new ArgumentException("ConversationId and ToUserId are required");
                }

                if (offer == null)
                {
                    throw new ArgumentNullException(nameof(offer), "Offer is required");
                }

                _logger.LogInformation($"📞 User {currentUserId} sending video call offer to {toUserId}");

                // Send offer to target user
                await Clients.User(toUserId.ToString())
                    .SendAsync("VideoCallOffer", offer, currentUserId.ToString());

                _logger.LogInformation($"✅ Video call offer sent to user {toUserId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error in SendVideoCallOffer");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }

        /// <summary>
        /// Send WebRTC answer for video call
        /// </summary>
        public async Task SendVideoCallAnswer(Guid conversationId, Guid toUserId, object answer)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                if (conversationId == Guid.Empty || toUserId == Guid.Empty)
                {
                    throw new ArgumentException("ConversationId and ToUserId are required");
                }

                if (answer == null)
                {
                    throw new ArgumentNullException(nameof(answer), "Answer is required");
                }

                _logger.LogInformation($"✅ User {currentUserId} sending video call answer to {toUserId}");

                // Send answer to target user
                await Clients.User(toUserId.ToString())
                    .SendAsync("VideoCallAnswer", answer);

                _logger.LogInformation($"✅ Video call answer sent to user {toUserId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error in SendVideoCallAnswer");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }

        /// <summary>
        /// End video call
        /// </summary>
        public async Task EndVideoCall(Guid conversationId, Guid toUserId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                if (conversationId == Guid.Empty || toUserId == Guid.Empty)
                {
                    throw new ArgumentException("ConversationId and ToUserId are required");
                }

                _logger.LogInformation($"📴 User {currentUserId} ending video call with {toUserId}");

                // Notify target user that call ended
                await Clients.User(toUserId.ToString())
                    .SendAsync("VideoCallEnded", currentUserId.ToString());

                _logger.LogInformation($"✅ Video call ended notification sent to user {toUserId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error in EndVideoCall");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }

        #endregion

        #region Audio Call Methods

        /// <summary>
        /// Start an audio call - notify the other user
        /// </summary>
        public async Task StartAudioCall(Guid conversationId, Guid toUserId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                if (conversationId == Guid.Empty)
                {
                    throw new ArgumentException("ConversationId is required");
                }

                if (toUserId == Guid.Empty)
                {
                    throw new ArgumentException("ToUserId is required");
                }

                // Verify user is participant in conversation
                var conversation = await _chatService.GetConversationByIdAsync(conversationId, currentUserId);
                if (conversation == null)
                {
                    throw new UnauthorizedAccessException("You are not a participant of this conversation");
                }

                // Get current user name
                var currentUserName = Context.User?.Identity?.Name ?? "User";

                _logger.LogInformation($"📞 User {currentUserId} starting audio call to {toUserId} in conversation {conversationId}");

                // Send incoming call notification to target user
                await Clients.User(toUserId.ToString())
                    .SendAsync("AudioCallIncoming", currentUserId.ToString(), currentUserName);

                _logger.LogInformation($"✅ Audio call notification sent to user {toUserId}");
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "⚠️ Unauthorized audio call attempt");
                await Clients.Caller.SendAsync("Error", $"Unauthorized: {ex.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error in StartAudioCall");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }

        /// <summary>
        /// Send WebRTC offer for audio call
        /// </summary>
        public async Task SendAudioCallOffer(Guid conversationId, Guid toUserId, object offer)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                if (conversationId == Guid.Empty || toUserId == Guid.Empty)
                {
                    throw new ArgumentException("ConversationId and ToUserId are required");
                }

                if (offer == null)
                {
                    throw new ArgumentNullException(nameof(offer), "Offer is required");
                }

                _logger.LogInformation($"📞 User {currentUserId} sending audio call offer to {toUserId}");

                // Send offer to target user
                await Clients.User(toUserId.ToString())
                    .SendAsync("AudioCallOffer", offer, currentUserId.ToString());

                _logger.LogInformation($"✅ Audio call offer sent to user {toUserId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error in SendAudioCallOffer");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }

        /// <summary>
        /// Send WebRTC answer for audio call
        /// </summary>
        public async Task SendAudioCallAnswer(Guid conversationId, Guid toUserId, object answer)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                if (conversationId == Guid.Empty || toUserId == Guid.Empty)
                {
                    throw new ArgumentException("ConversationId and ToUserId are required");
                }

                if (answer == null)
                {
                    throw new ArgumentNullException(nameof(answer), "Answer is required");
                }

                _logger.LogInformation($"✅ User {currentUserId} sending audio call answer to {toUserId}");

                // Send answer to target user
                await Clients.User(toUserId.ToString())
                    .SendAsync("AudioCallAnswer", answer);

                _logger.LogInformation($"✅ Audio call answer sent to user {toUserId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error in SendAudioCallAnswer");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }

        /// <summary>
        /// End audio call
        /// </summary>
        public async Task EndAudioCall(Guid conversationId, Guid toUserId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                if (conversationId == Guid.Empty || toUserId == Guid.Empty)
                {
                    throw new ArgumentException("ConversationId and ToUserId are required");
                }

                _logger.LogInformation($"📴 User {currentUserId} ending audio call with {toUserId}");

                // Notify target user that call ended
                await Clients.User(toUserId.ToString())
                    .SendAsync("AudioCallEnded", currentUserId.ToString());

                _logger.LogInformation($"✅ Audio call ended notification sent to user {toUserId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error in EndAudioCall");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }

        #endregion

        #region ICE Candidate Methods (Shared for both Video and Audio)

        /// <summary>
        /// Send ICE candidate for WebRTC connection
        /// This is shared between video and audio calls
        /// </summary>
        public async Task SendIceCandidate(Guid conversationId, Guid toUserId, object candidate)
        {
            try
            {
                var currentUserId = GetCurrentUserId();

                if (conversationId == Guid.Empty || toUserId == Guid.Empty)
                {
                    throw new ArgumentException("ConversationId and ToUserId are required");
                }

                if (candidate == null)
                {
                    throw new ArgumentNullException(nameof(candidate), "ICE candidate is required");
                }

                _logger.LogDebug($"🧊 User {currentUserId} sending ICE candidate to {toUserId}");

                // Send ICE candidate to target user
                await Clients.User(toUserId.ToString())
                    .SendAsync("IceCandidate", candidate, currentUserId.ToString());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error in SendIceCandidate");
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }

        #endregion
    }
}