using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.ConversationsInterface
{
    public interface IConversationRepository
    {
        Task<Conversation> GetByIdAsync(Guid conversationId);
        Task<Conversation> GetByIdWithDetailsAsync(Guid conversationId);
        Task<List<Conversation>> GetUserConversationsAsync(Guid userId, int pageNumber, int pageSize);
        Task<Conversation> GetDirectConversationAsync(Guid user1Id, Guid user2Id);
        Task<Conversation> GetConversationByEventIdAsync(Guid eventId);
        Task<Conversation> CreateAsync(Conversation conversation);
        Task UpdateAsync(Conversation conversation);
        Task DeleteAsync(Guid conversationId);
        Task<int> GetUnreadCountAsync(Guid conversationId, Guid userId);
        Task<bool> IsParticipantAsync(Guid conversationId, Guid userId);
    }
}
