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
    public class ConversationParticipantRepository : IConversationParticipantRepository
    {
        private readonly BEESRSDBContext _context;

        public ConversationParticipantRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<ConversationParticipant> GetByIdAsync(Guid participantId)
        {
            return await _context.ConversationParticipants
                .Include(p => p.User)
                    .ThenInclude(u => u.UserProfile)
                .FirstOrDefaultAsync(p => p.ParticipantId == participantId);
        }

        public async Task<ConversationParticipant> GetParticipantAsync(Guid conversationId, Guid userId)
        {
            return await _context.ConversationParticipants
                .Include(p => p.User)
                    .ThenInclude(u => u.UserProfile)
                .FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.UserId == userId);
        }

        public async Task<List<ConversationParticipant>> GetConversationParticipantsAsync(Guid conversationId)
        {
            return await _context.ConversationParticipants
                .Include(p => p.User)
                    .ThenInclude(u => u.UserProfile)
                .Where(p => p.ConversationId == conversationId && p.IsActive)
                .ToListAsync();
        }

        public async Task<List<ConversationParticipant>> GetUserParticipationsAsync(Guid userId)
        {
            return await _context.ConversationParticipants
                .Include(p => p.Conversation)
                .Include(p => p.User)
                    .ThenInclude(u => u.UserProfile)
                .Where(p => p.UserId == userId && p.IsActive)
                .ToListAsync();
        }

        public async Task<ConversationParticipant> AddAsync(ConversationParticipant participant)
        {
            await _context.ConversationParticipants.AddAsync(participant);
            await _context.SaveChangesAsync();
            return participant;
        }

        public async Task UpdateAsync(ConversationParticipant participant)
        {
            _context.ConversationParticipants.Update(participant);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveAsync(Guid participantId)
        {
            var participant = await GetByIdAsync(participantId);
            if (participant != null)
            {
                participant.IsActive = false;
                participant.LeftAt = DateTimeOffset.UtcNow;
                await UpdateAsync(participant);
            }
        }

        public async Task<bool> IsAdminAsync(Guid conversationId, Guid userId)
        {
            return await _context.ConversationParticipants
                .AnyAsync(p => p.ConversationId == conversationId &&
                             p.UserId == userId &&
                             p.Role == "admin" &&
                             p.IsActive);
        }
    }
}