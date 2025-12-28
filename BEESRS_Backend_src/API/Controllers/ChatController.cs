using Application.Interfaces;
using Infrastructure.Models.Chat;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;
        private readonly ILogger<ChatController> _logger;

        public ChatController(IChatService chatService, ILogger<ChatController> logger)
        {
            _chatService = chatService;
            _logger = logger;
        }

        /// <summary>
        /// Send a message to the chatbot
        /// </summary>
        [HttpPost("message")]
        public async Task<ActionResult<ChatBotMessageDto>> SendMessage([FromBody] ChatBotMessageRequestDto request)
        {
            try
            {
                var userId = GetUserId();
                var response = await _chatService.ProcessMessageAsync(userId, request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending message");
                return StatusCode(500, new { message = "Error processing your message" });
            }
        }

        /// <summary>
        /// Get all conversations for current user
        /// </summary>
        [HttpGet("conversations")]
        public async Task<ActionResult<List<ChatBotDto>>> GetConversations([FromQuery] int limit = 20)
        {
            try
            {
                var userId = GetUserId();
                var conversations = await _chatService.GetUserConversationsAsync(userId, limit);
                return Ok(conversations);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting conversations");
                return StatusCode(500, new { message = "Error loading conversations" });
            }
        }

        /// <summary>
        /// Get a specific conversation with messages
        /// </summary>
        [HttpGet("conversations/{conversationId}")]
        public async Task<ActionResult<ChatBotDto>> GetConversation(Guid conversationId)
        {
            try
            {
                var conversation = await _chatService.GetConversationAsync(conversationId);

                if (conversation == null)
                    return NotFound();

                return Ok(conversation);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting conversation");
                return StatusCode(500, new { message = "Error loading conversation" });
            }
        }

        /// <summary>
        /// Create a new conversation
        /// </summary>
        [HttpPost("conversations")]
        public async Task<ActionResult<ChatBotDto>> CreateConversation([FromBody] CreateConversationDtos request)
        {
            try
            {
                var userId = GetUserId();
                var conversation = await _chatService.CreateConversationAsync(userId, request.Title);
                return CreatedAtAction(nameof(GetConversation),
                    new { conversationId = conversation.ConversationId },
                    conversation);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating conversation");
                return StatusCode(500, new { message = "Error creating conversation" });
            }
        }

        /// <summary>
        /// Delete a conversation
        /// </summary>
        [HttpDelete("conversations/{conversationId}")]
        public async Task<ActionResult> DeleteConversation(Guid conversationId)
        {
            try
            {
                var userId = GetUserId();
                var result = await _chatService.DeleteConversationAsync(conversationId, userId);

                if (!result)
                    return NotFound();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting conversation");
                return StatusCode(500, new { message = "Error deleting conversation" });
            }
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
                throw new UnauthorizedAccessException("User not authenticated");

            return Guid.Parse(userIdClaim);
        }
    }

    public class CreateConversationDtos
    {
        public string Title { get; set; }
    }
}