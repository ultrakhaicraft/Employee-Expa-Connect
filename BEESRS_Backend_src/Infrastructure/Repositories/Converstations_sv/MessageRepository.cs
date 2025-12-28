using Domain.Entities;
using Infrastructure.Interfaces.ConversationsInterface;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Infrastructure.Repositories.Converstations_sv
{
    public class MessageRepository : IMessageRepository
    {
        private readonly BEESRSDBContext _context;

        public MessageRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<Message> GetByIdAsync(Guid messageId)
        {
            return await _context.Messages
                .Include(m => m.Sender)
                    .ThenInclude(s => s.UserProfile)
                .FirstOrDefaultAsync(m => m.MessageId == messageId);
        }

        public async Task<Message> GetByIdWithDetailsAsync(Guid messageId)
        {
            return await _context.Messages
                .Include(m => m.Sender)
                    .ThenInclude(s => s.UserProfile)
                .Include(m => m.ReplyToMessage)
                    .ThenInclude(r => r.Sender)
                        .ThenInclude(s => s.UserProfile)
                .Include(m => m.ReadReceipts)
                    .ThenInclude(r => r.User)
                .FirstOrDefaultAsync(m => m.MessageId == messageId);
        }

        public async Task<List<Message>> GetConversationMessagesAsync(Guid conversationId, int pageNumber, int pageSize)
        {
            return await _context.Messages
                .Include(m => m.Sender)
                    .ThenInclude(s => s.UserProfile)
                .Include(m => m.ReplyToMessage)
                    .ThenInclude(r => r.Sender)
                        .ThenInclude(s => s.UserProfile)
                .Include(m => m.ReadReceipts)
                    .ThenInclude(r => r.User)
                .Where(m => m.ConversationId == conversationId && !m.IsDeleted)
                .OrderByDescending(m => m.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<List<Message>> GetMessagesAfterAsync(Guid conversationId, DateTimeOffset after, int limit)
        {
            return await _context.Messages
                .Include(m => m.Sender)
                    .ThenInclude(s => s.UserProfile)
                .Include(m => m.ReplyToMessage)
                    .ThenInclude(r => r.Sender)
                        .ThenInclude(s => s.UserProfile)
                .Include(m => m.ReadReceipts)
                    .ThenInclude(r => r.User)
                .Where(m => m.ConversationId == conversationId &&
                           m.CreatedAt > after &&
                           !m.IsDeleted)
                .OrderBy(m => m.CreatedAt)
                .Take(limit)
                .ToListAsync();
        }

        public async Task<Message> GetLastMessageAsync(Guid conversationId)
        {
            return await _context.Messages
                .Include(m => m.Sender)
                    .ThenInclude(s => s.UserProfile)
                .Where(m => m.ConversationId == conversationId && !m.IsDeleted)
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<Message> CreateAsync(Message message)
        {
            await _context.Messages.AddAsync(message);
            await _context.SaveChangesAsync();

            // Update conversation's last message time
            var conversation = await _context.Conversations
                .FirstOrDefaultAsync(c => c.ConversationId == message.ConversationId);

            if (conversation != null)
            {
                conversation.LastMessageAt = message.CreatedAt;
                conversation.UpdatedAt = DateTimeOffset.UtcNow;
                await _context.SaveChangesAsync();
            }

            // Reload message with all navigation properties
            return await GetByIdWithDetailsAsync(message.MessageId);
        }

        public async Task UpdateAsync(Message message)
        {
            _context.Messages.Update(message);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid messageId)
        {
            var message = await GetByIdAsync(messageId);
            if (message != null)
            {
                message.IsDeleted = true;
                message.DeletedAt = DateTimeOffset.UtcNow;
                await UpdateAsync(message);
            }
        }

        public async Task<int> GetUnreadCountAsync(Guid conversationId, Guid userId, DateTimeOffset? lastReadAt)
        {
            if (lastReadAt == null)
            {
                return await _context.Messages
                    .CountAsync(m => m.ConversationId == conversationId &&
                                   m.SenderId != userId &&
                                   !m.IsDeleted);
            }

            return await _context.Messages
                .CountAsync(m => m.ConversationId == conversationId &&
                               m.SenderId != userId &&
                               m.CreatedAt > lastReadAt &&
                               !m.IsDeleted);
        }
    }
}