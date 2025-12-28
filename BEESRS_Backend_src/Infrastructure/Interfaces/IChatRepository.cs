using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IChatRepository
    {
        Task<ChatConversation> GetConversationByIdAsync(Guid conversationId);
        Task<ChatConversation> GetConversationWithMessagesAsync(Guid conversationId);
        Task<List<ChatConversation>> GetUserConversationsAsync(Guid userId, int limit);
        Task<ChatConversation> CreateConversationAsync(ChatConversation conversation);
        Task UpdateConversationAsync(ChatConversation conversation);
        Task<bool> DeleteConversationAsync(Guid conversationId, Guid userId);
        Task<ChatMessage> AddMessageAsync(ChatMessage message);
        Task<List<ChatMessage>> GetConversationMessagesAsync(Guid conversationId);
        Task<List<ChatMessage>> GetConversationMessagesAsync(Guid conversationId, int limit);
    }
}
