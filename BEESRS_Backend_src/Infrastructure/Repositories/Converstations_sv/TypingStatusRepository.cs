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
    public class TypingStatusRepository : ITypingStatusRepository
    {
        private readonly BEESRSDBContext _context;

        public TypingStatusRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<TypingStatus> GetByIdAsync(Guid typingId)
        {
            return await _context.TypingStatuses
                .FirstOrDefaultAsync(t => t.TypingId == typingId);
        }

        public async Task<TypingStatus> GetStatusAsync(Guid conversationId, Guid userId)
        {
            return await _context.TypingStatuses
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.ConversationId == conversationId && t.UserId == userId);
        }

        public async Task<List<TypingStatus>> GetConversationTypingStatusAsync(Guid conversationId)
        {
            return await _context.TypingStatuses
                .Include(t => t.User)
                .Where(t => t.ConversationId == conversationId && t.IsTyping)
                .ToListAsync();
        }

        public async Task<TypingStatus> UpsertAsync(TypingStatus status)
        {
            var existing = await GetStatusAsync(status.ConversationId, status.UserId);

            if (existing != null)
            {
                existing.IsTyping = status.IsTyping;
                existing.LastActivityAt = DateTimeOffset.UtcNow;
                _context.TypingStatuses.Update(existing);
            }
            else
            {
                await _context.TypingStatuses.AddAsync(status);
            }

            await _context.SaveChangesAsync();
            return existing ?? status;
        }

        public async Task RemoveAsync(Guid typingId)
        {
            var status = await GetByIdAsync(typingId);
            if (status != null)
            {
                _context.TypingStatuses.Remove(status);
                await _context.SaveChangesAsync();
            }
        }

        public async Task RemoveExpiredAsync(TimeSpan expiration)
        {
            var cutoffTime = DateTimeOffset.UtcNow - expiration;
            var expired = await _context.TypingStatuses
                .Where(t => t.LastActivityAt < cutoffTime)
                .ToListAsync();

            _context.TypingStatuses.RemoveRange(expired);
            await _context.SaveChangesAsync();
        }
    }

}
