using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.ConversationsInterface
{
    public interface IMessageRepository
    {
        Task<Message> GetByIdAsync(Guid messageId);
        Task<Message> GetByIdWithDetailsAsync(Guid messageId);
        Task<List<Message>> GetConversationMessagesAsync(Guid conversationId, int pageNumber, int pageSize);
        Task<List<Message>> GetMessagesAfterAsync(Guid conversationId, DateTimeOffset after, int limit);
        Task<Message> GetLastMessageAsync(Guid conversationId);
        Task<Message> CreateAsync(Message message);
        Task UpdateAsync(Message message);
        Task DeleteAsync(Guid messageId);
        Task<int> GetUnreadCountAsync(Guid conversationId, Guid userId, DateTimeOffset? lastReadAt);
    }

}
