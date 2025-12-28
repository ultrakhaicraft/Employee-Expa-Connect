using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.ConversationsInterface
{
    public interface IMessageReadReceiptRepository
    {
        Task<MessageReadReceipt> GetByIdAsync(Guid receiptId);
        Task<MessageReadReceipt> GetReceiptAsync(Guid messageId, Guid userId);
        Task<List<MessageReadReceipt>> GetMessageReceiptsAsync(Guid messageId);
        Task<MessageReadReceipt> AddAsync(MessageReadReceipt receipt);
        Task MarkAsReadAsync(Guid messageId, Guid userId);
        Task MarkConversationAsReadAsync(Guid conversationId, Guid userId, DateTimeOffset readAt);
        Task<bool> IsReadByUserAsync(Guid messageId, Guid userId);
    }
}
