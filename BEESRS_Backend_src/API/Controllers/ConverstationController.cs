using API.Response;
using Application.Interfaces;
using Infrastructure.Models.Converstation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ConverstationController : ControllerBase
    {
        private readonly IConverstationService _chatService;

        public ConverstationController(IConverstationService chatService)
        {
            _chatService = chatService;
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("User not authenticated");
            }
            return userId;
        }

        #region Conversation Endpoints

        /// <summary>
        /// Get all conversations for current user
        /// </summary>
        [HttpGet("conversations")]
        public async Task<ActionResult<ApiResponse<ConversationListDto>>> GetConversations(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _chatService.GetUserConversationsAsync(userId, pageNumber, pageSize);
                return Ok(ApiResponse<ConversationListDto>.SuccessResult(result, "Conversations retrieved successfully"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<ConversationListDto>.FailResult(ex.Message));
            }
        }

        /// <summary>
        /// Get conversation by ID
        /// </summary>
        [HttpGet("conversations/{conversationId}")]
        public async Task<ActionResult<ApiResponse<ConversationDto>>> GetConversation(Guid conversationId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _chatService.GetConversationByIdAsync(conversationId, userId);
                return Ok(ApiResponse<ConversationDto>.SuccessResult(result, "Conversation retrieved successfully"));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<ConversationDto>.FailResult(ex.Message));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ApiResponse<ConversationDto>.FailResult(ex.Message));
            }

            catch (Exception ex)
            {
                return BadRequest(ApiResponse<ConversationDto>.FailResult(ex.Message));
            }
        }

        /// <summary>
        /// Create new conversation
        /// </summary>
        [HttpPost("conversations")]
        public async Task<ActionResult<ApiResponse<ConversationDto>>> CreateConversation(
            [FromBody] CreateConversationDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _chatService.CreateConversationAsync(userId, dto);
                return Ok(ApiResponse<ConversationDto>.SuccessResult(result, "Conversation created successfully"));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<ConversationDto>.FailResult(ex.Message));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<ConversationDto>.FailResult(ex.Message));
            }
        }

        /// <summary>
        /// Get or create direct conversation with another user
        /// </summary>
        [HttpPost("conversations/direct/{otherUserId}")]
        public async Task<ActionResult<ApiResponse<ConversationDto>>> GetOrCreateDirectConversation(Guid otherUserId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _chatService.GetOrCreateDirectConversationAsync(userId, otherUserId);
                return Ok(ApiResponse<ConversationDto>.SuccessResult(result, "Conversation retrieved successfully"));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<ConversationDto>.FailResult(ex.Message));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<ConversationDto>.FailResult(ex.Message));
            }
        }

        /// <summary>
        /// Update conversation details
        /// </summary>
        [HttpPut("conversations/{conversationId}")]
        public async Task<ActionResult<ApiResponse<ConversationDto>>> UpdateConversation(
            Guid conversationId,
            [FromBody] UpdateConversationDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _chatService.UpdateConversationAsync(
                    conversationId, userId, dto.ConversationName, dto.ConversationAvatar);
                return Ok(ApiResponse<ConversationDto>.SuccessResult(result, "Conversation updated successfully"));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<ConversationDto>.FailResult(ex.Message));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ApiResponse<ConversationDto>.FailResult(ex.Message));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<ConversationDto>.FailResult(ex.Message));
            }
        }

        /// <summary>
        /// Delete conversation
        /// </summary>
        [HttpDelete("conversations/{conversationId}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteConversation(Guid conversationId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _chatService.DeleteConversationAsync(conversationId, userId);
                return Ok(ApiResponse<bool>.SuccessResult(result, "Conversation deleted successfully"));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ApiResponse<bool>.FailResult(ex.Message));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<bool>.FailResult(ex.Message));
            }
        }

        #endregion

        #region Participant Endpoints

        /// <summary>
        /// Get conversation participants
        /// </summary>
        [HttpGet("conversations/{conversationId}/participants")]
        public async Task<ActionResult<ApiResponse<List<ParticipantDto>>>> GetParticipants(Guid conversationId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _chatService.GetConversationParticipantsAsync(conversationId, userId);
                return Ok(ApiResponse<List<ParticipantDto>>.SuccessResult(result, "Participants retrieved successfully"));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ApiResponse<List<ParticipantDto>>.FailResult(ex.Message));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<List<ParticipantDto>>.FailResult(ex.Message));
            }
        }

        /// <summary>
        /// Add participants to conversation
        /// </summary>
        [HttpPost("conversations/{conversationId}/participants")]
        public async Task<ActionResult<ApiResponse<List<ParticipantDto>>>> AddParticipants(
            Guid conversationId,
            [FromBody] AddParticipantsDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _chatService.AddParticipantsAsync(conversationId, userId, dto.UserIds);
                return Ok(ApiResponse<List<ParticipantDto>>.SuccessResult(result, "Participants added successfully"));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<List<ParticipantDto>>.FailResult(ex.Message));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ApiResponse<List<ParticipantDto>>.FailResult(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<List<ParticipantDto>>.FailResult(ex.Message));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<List<ParticipantDto>>.FailResult(ex.Message));
            }
        }

        /// <summary>
        /// Remove participant from conversation
        /// </summary>
        [HttpDelete("conversations/{conversationId}/participants/{participantId}")]
        public async Task<ActionResult<ApiResponse<bool>>> RemoveParticipant(
            Guid conversationId,
            Guid participantId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var result = await _chatService.RemoveParticipantAsync(conversationId, currentUserId, participantId);
                return Ok(ApiResponse<bool>.SuccessResult(result, "Participant removed successfully"));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ApiResponse<bool>.FailResult(ex.Message));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<bool>.FailResult(ex.Message));
            }
        }

        /// <summary>
        /// Leave conversation
        /// </summary>
        [HttpPost("conversations/{conversationId}/leave")]
        public async Task<ActionResult<ApiResponse<bool>>> LeaveConversation(Guid conversationId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _chatService.LeaveConversationAsync(conversationId, userId);
                return Ok(ApiResponse<bool>.SuccessResult(result, "Left conversation successfully"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<bool>.FailResult(ex.Message));
            }
        }

        /// <summary>
        /// Update participant role
        /// </summary>
        [HttpPut("conversations/{conversationId}/participants/{participantId}/role")]
        public async Task<ActionResult<ApiResponse<bool>>> UpdateParticipantRole(
            Guid conversationId,
            Guid participantId,
            [FromBody] UpdateParticipantRoleDto dto)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var result = await _chatService.UpdateParticipantRoleAsync(conversationId, currentUserId, participantId, dto.Role);
                return Ok(ApiResponse<bool>.SuccessResult(result, "Role updated successfully"));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ApiResponse<bool>.FailResult(ex.Message));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<bool>.FailResult(ex.Message));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<bool>.FailResult(ex.Message));
            }
        }

        #endregion

        #region Message Endpoints

        /// <summary>
        /// Get conversation messages
        /// </summary>
        [HttpGet("conversations/{conversationId}/messages")]
        public async Task<ActionResult<ApiResponse<MessageListDto>>> GetMessages(
            Guid conversationId,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _chatService.GetConversationMessagesAsync(conversationId, userId, pageNumber, pageSize);
                return Ok(ApiResponse<MessageListDto>.SuccessResult(result, "Messages retrieved successfully"));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ApiResponse<MessageListDto>.FailResult(ex.Message));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<MessageListDto>.FailResult(ex.Message));
            }
        }

        /// <summary>
        /// Send message (REST endpoint - also available via SignalR)
        /// </summary>
        [HttpPost("messages")]
        public async Task<ActionResult<ApiResponse<MessageDto>>> SendMessage([FromBody] SendMessageDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _chatService.SendMessageAsync(userId, dto);
                return Ok(ApiResponse<MessageDto>.SuccessResult(result, "Message sent successfully"));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ApiResponse<MessageDto>.FailResult(ex.Message));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<MessageDto>.FailResult(ex.Message));
            }
        }

        /// <summary>
        /// Edit message
        /// </summary>
        [HttpPut("messages/{messageId}")]
        public async Task<ActionResult<ApiResponse<MessageDto>>> EditMessage(
            Guid messageId,
            [FromBody] EditMessageDto dto)
        {
            try
            {
                dto.MessageId = messageId;
                var userId = GetCurrentUserId();
                var result = await _chatService.EditMessageAsync(userId, dto);
                return Ok(ApiResponse<MessageDto>.SuccessResult(result, "Message edited successfully"));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<MessageDto>.FailResult(ex.Message));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ApiResponse<MessageDto>.FailResult(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<MessageDto>.FailResult(ex.Message));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<MessageDto>.FailResult(ex.Message));
            }
        }

        /// <summary>
        /// Delete message
        /// </summary>
        [HttpDelete("messages/{messageId}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteMessage(Guid messageId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _chatService.DeleteMessageAsync(messageId, userId);
                return Ok(ApiResponse<bool>.SuccessResult(result, "Message deleted successfully"));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ApiResponse<bool>.FailResult(ex.Message));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<bool>.FailResult(ex.Message));
            }
        }

        /// <summary>
        /// Mark message as read
        /// </summary>
        [HttpPost("messages/{messageId}/read")]
        public async Task<ActionResult<ApiResponse<bool>>> MarkMessageAsRead(Guid messageId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _chatService.MarkMessageAsReadAsync(messageId, userId);
                return Ok(ApiResponse<bool>.SuccessResult(result, "Message marked as read"));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ApiResponse<bool>.FailResult(ex.Message));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<bool>.FailResult(ex.Message));
            }
        }

        /// <summary>
        /// Mark conversation as read
        /// </summary>
        [HttpPost("conversations/{conversationId}/read")]
        public async Task<ActionResult<ApiResponse<bool>>> MarkConversationAsRead(Guid conversationId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _chatService.MarkConversationAsReadAsync(conversationId, userId);
                return Ok(ApiResponse<bool>.SuccessResult(result, "Conversation marked as read"));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ApiResponse<bool>.FailResult(ex.Message));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<bool>.FailResult(ex.Message));
            }
        }

        #endregion

        #region Typing Status

        /// <summary>
        /// Get typing status for conversation
        /// </summary>
        [HttpGet("conversations/{conversationId}/typing")]
        public async Task<ActionResult<ApiResponse<List<TypingStatusDto>>>> GetTypingStatus(Guid conversationId)
        {
            try
            {
                var result = await _chatService.GetTypingStatusAsync(conversationId);
                return Ok(ApiResponse<List<TypingStatusDto>>.SuccessResult(result, "Typing status retrieved successfully"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<List<TypingStatusDto>>.FailResult(ex.Message));
            }
        }

        #endregion
    }

    // Additional DTO for update conversation
    public class UpdateConversationDto
    {
        public string? ConversationName { get; set; }
        public string? ConversationAvatar { get; set; }
    }
}