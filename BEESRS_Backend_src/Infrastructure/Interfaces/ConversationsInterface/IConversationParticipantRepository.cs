using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.ConversationsInterface
{
    public interface IConversationParticipantRepository
    {
        Task<ConversationParticipant> GetByIdAsync(Guid participantId);
        Task<ConversationParticipant> GetParticipantAsync(Guid conversationId, Guid userId);
        Task<List<ConversationParticipant>> GetConversationParticipantsAsync(Guid conversationId);
        Task<List<ConversationParticipant>> GetUserParticipationsAsync(Guid userId);
        Task<ConversationParticipant> AddAsync(ConversationParticipant participant);
        Task UpdateAsync(ConversationParticipant participant);
        Task RemoveAsync(Guid participantId);
        Task<bool> IsAdminAsync(Guid conversationId, Guid userId);
    }
}
