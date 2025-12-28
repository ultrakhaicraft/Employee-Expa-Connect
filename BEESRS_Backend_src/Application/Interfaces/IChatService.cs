using Infrastructure.Models.Chat;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IChatService
    {
        Task<ChatBotMessageResponseDto> ProcessMessageAsync(Guid userId, ChatBotMessageRequestDto request);
        Task<ChatBotDto> GetConversationAsync(Guid conversationId);
        Task<List<ChatBotDto>> GetUserConversationsAsync(Guid userId, int limit = 20);
        Task<ChatBotDto> CreateConversationAsync(Guid userId, string title = null);
        Task<bool> DeleteConversationAsync(Guid conversationId, Guid userId);
    }
}
