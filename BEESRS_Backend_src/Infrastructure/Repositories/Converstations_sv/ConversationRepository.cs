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
    public class ConversationRepository : IConversationRepository
    {
        private readonly BEESRSDBContext _context;

        public ConversationRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<Conversation> GetByIdAsync(Guid conversationId)
        {
            return await _context.Conversations
                .FirstOrDefaultAsync(c => c.ConversationId == conversationId);
        }

        public async Task<Conversation> GetByIdWithDetailsAsync(Guid conversationId)
        {
            return await _context.Conversations
                .Include(c => c.Participants)
                    .ThenInclude(p => p.User)
                        .ThenInclude(u => u.UserProfile)
                .Include(c => c.Messages.OrderByDescending(m => m.CreatedAt).Take(1))
                    .ThenInclude(m => m.Sender)
                        .ThenInclude(s => s.UserProfile)
                .FirstOrDefaultAsync(c => c.ConversationId == conversationId);
        }

        public async Task<List<Conversation>> GetUserConversationsAsync(Guid userId, int pageNumber, int pageSize)
        {
            return await _context.Conversations
                .Include(c => c.Participants)
                    .ThenInclude(p => p.User)
                        .ThenInclude(u => u.UserProfile)
                .Include(c => c.Messages.OrderByDescending(m => m.CreatedAt).Take(1))
                    .ThenInclude(m => m.Sender)
                        .ThenInclude(s => s.UserProfile)
                .Include(c => c.Event) // Include Event for event conversations
                .Where(c => c.Participants.Any(p => p.UserId == userId && p.IsActive))
                .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<Conversation> GetDirectConversationAsync(Guid user1Id, Guid user2Id)
        {
            return await _context.Conversations
                .Include(c => c.Participants)
                    .ThenInclude(p => p.User)
                        .ThenInclude(u => u.UserProfile)
                .Where(c => c.ConversationType == "direct" &&
                           c.Participants.Count == 2 &&
                           c.Participants.Any(p => p.UserId == user1Id && p.IsActive) &&
                           c.Participants.Any(p => p.UserId == user2Id && p.IsActive))
                .FirstOrDefaultAsync();
        }

        public async Task<Conversation> GetConversationByEventIdAsync(Guid eventId)
        {
            return await _context.Conversations
                .Include(c => c.Participants)
                    .ThenInclude(p => p.User)
                        .ThenInclude(u => u.UserProfile)
                .Where(c => c.EventId == eventId && c.IsActive)
                .FirstOrDefaultAsync();
        }

        public async Task<Conversation> CreateAsync(Conversation conversation)
        {
            await _context.Conversations.AddAsync(conversation);
            await _context.SaveChangesAsync();
            return conversation;
        }

        public async Task UpdateAsync(Conversation conversation)
        {
            conversation.UpdatedAt = DateTimeOffset.UtcNow;
            _context.Conversations.Update(conversation);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid conversationId)
        {
            var conversation = await GetByIdAsync(conversationId);
            if (conversation != null)
            {
                conversation.IsActive = false;
                await UpdateAsync(conversation);
            }
        }

        public async Task<int> GetUnreadCountAsync(Guid conversationId, Guid userId)
        {
            var participant = await _context.ConversationParticipants
                .FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.UserId == userId);

            if (participant == null || participant.LastReadAt == null)
            {
                return await _context.Messages
                    .CountAsync(m => m.ConversationId == conversationId &&
                                   m.SenderId != userId &&
                                   !m.IsDeleted);
            }

            return await _context.Messages
                .CountAsync(m => m.ConversationId == conversationId &&
                               m.SenderId != userId &&
                               m.CreatedAt > participant.LastReadAt &&
                               !m.IsDeleted);
        }

        public async Task<bool> IsParticipantAsync(Guid conversationId, Guid userId)
        {
            return await _context.ConversationParticipants
                .AnyAsync(p => p.ConversationId == conversationId &&
                             p.UserId == userId &&
                             p.IsActive);
        }
    }
}