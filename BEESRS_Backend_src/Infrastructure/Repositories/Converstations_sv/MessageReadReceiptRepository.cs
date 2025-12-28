using Domain.Entities;
using Infrastructure.Interfaces.ConversationsInterface;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Repositories.Converstations_sv
{
    public class MessageReadReceiptRepository : IMessageReadReceiptRepository
    {
        private readonly BEESRSDBContext _context;

        public MessageReadReceiptRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<MessageReadReceipt> GetByIdAsync(Guid receiptId)
        {
            return await _context.MessageReadReceipts
                .FirstOrDefaultAsync(r => r.ReceiptId == receiptId);
        }

        public async Task<MessageReadReceipt> GetReceiptAsync(Guid messageId, Guid userId)
        {
            return await _context.MessageReadReceipts
                .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == userId);
        }

        public async Task<List<MessageReadReceipt>> GetMessageReceiptsAsync(Guid messageId)
        {
            return await _context.MessageReadReceipts
                .Include(r => r.User)
                .Where(r => r.MessageId == messageId)
                .ToListAsync();
        }

        public async Task<MessageReadReceipt> AddAsync(MessageReadReceipt receipt)
        {
            await _context.MessageReadReceipts.AddAsync(receipt);
            await _context.SaveChangesAsync();
            return receipt;
        }

        public async Task MarkAsReadAsync(Guid messageId, Guid userId)
        {
            var existing = await GetReceiptAsync(messageId, userId);
            if (existing == null)
            {
                var receipt = new MessageReadReceipt
                {
                    MessageId = messageId,
                    UserId = userId,
                    ReadAt = DateTimeOffset.UtcNow
                };
                await AddAsync(receipt);
            }
        }

        public async Task MarkConversationAsReadAsync(Guid conversationId, Guid userId, DateTimeOffset readAt)
        {
            var messages = await _context.Messages
                .Where(m => m.ConversationId == conversationId &&
                           m.SenderId != userId &&
                           !m.IsDeleted)
                .Select(m => m.MessageId)
                .ToListAsync();

            foreach (var messageId in messages)
            {
                var existing = await GetReceiptAsync(messageId, userId);
                if (existing == null)
                {
                    var receipt = new MessageReadReceipt
                    {
                        MessageId = messageId,
                        UserId = userId,
                        ReadAt = readAt
                    };
                    await AddAsync(receipt);
                }
            }

            // Update participant's last read time
            var participant = await _context.ConversationParticipants
                .FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.UserId == userId);

            if (participant != null)
            {
                participant.LastReadAt = readAt;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> IsReadByUserAsync(Guid messageId, Guid userId)
        {
            return await _context.MessageReadReceipts
                .AnyAsync(r => r.MessageId == messageId && r.UserId == userId);
        }
    }

}
