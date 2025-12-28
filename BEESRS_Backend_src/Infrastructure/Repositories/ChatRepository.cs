using Domain.Entities;
using Infrastructure.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class ChatRepository : IChatRepository
    {
        private readonly BEESRSDBContext _context;

        public ChatRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<ChatConversation> GetConversationByIdAsync(Guid conversationId)
        {
            return await _context.ChatConversations
                .FirstOrDefaultAsync(c => c.ConversationId == conversationId);
        }

        public async Task<ChatConversation> GetConversationWithMessagesAsync(Guid conversationId)
        {
            return await _context.ChatConversations
                .Include(c => c.Messages.OrderBy(m => m.CreatedAt))
                .FirstOrDefaultAsync(c => c.ConversationId == conversationId);
        }

        public async Task<List<ChatConversation>> GetUserConversationsAsync(Guid userId, int limit)
        {
            return await _context.ChatConversations
                .Where(c => c.UserId == userId && c.IsActive)
                .OrderByDescending(c => c.LastActivityAt)
                .Take(limit)
                .Include(c => c.Messages.OrderBy(m => m.CreatedAt))
                .ToListAsync();
        }

        public async Task<ChatConversation> CreateConversationAsync(ChatConversation conversation)
        {
            await _context.ChatConversations.AddAsync(conversation);
            return conversation;
        }

        public async Task UpdateConversationAsync(ChatConversation conversation)
        {
            _context.ChatConversations.Update(conversation);
        }

        public async Task<bool> DeleteConversationAsync(Guid conversationId, Guid userId)
        {
            var conversation = await _context.ChatConversations
                .FirstOrDefaultAsync(c => c.ConversationId == conversationId && c.UserId == userId);

            if (conversation == null)
                return false;

            conversation.IsActive = false;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<ChatMessage> AddMessageAsync(ChatMessage message)
        {
            await _context.ChatMessages.AddAsync(message);
            return message;
        }

        public async Task<List<ChatMessage>> GetConversationMessagesAsync(Guid conversationId)
        {
            return await _context.ChatMessages
                .Where(m => m.ConversationId == conversationId)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<ChatMessage>> GetConversationMessagesAsync(Guid conversationId, int limit)
        {
            return await _context.ChatMessages
                .Where(m => m.ConversationId == conversationId)
                .OrderByDescending(m => m.CreatedAt)
                .Take(limit)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync();
        }
    }
}