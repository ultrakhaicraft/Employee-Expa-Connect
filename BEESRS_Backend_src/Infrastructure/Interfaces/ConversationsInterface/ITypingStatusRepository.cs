using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.ConversationsInterface
{
    public interface ITypingStatusRepository
    {
        Task<TypingStatus> GetByIdAsync(Guid typingId);
        Task<TypingStatus> GetStatusAsync(Guid conversationId, Guid userId);
        Task<List<TypingStatus>> GetConversationTypingStatusAsync(Guid conversationId);
        Task<TypingStatus> UpsertAsync(TypingStatus status);
        Task RemoveAsync(Guid typingId);
        Task RemoveExpiredAsync(TimeSpan expiration);
    }
}
