using Domain.Entities;
using Infrastructure.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Infrastructure.Repositories
{
    public class EventParticipantRepository : IEventParticipantRepository
    {
        private readonly BEESRSDBContext _context;

        public EventParticipantRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<EventParticipant?> GetByEventAndUserAsync(Guid eventId, Guid userId)
        {
            return await _context.EventParticipants
                .FirstOrDefaultAsync(ep => ep.EventId == eventId && ep.UserId == userId);
        }

        public async Task<List<EventParticipant>> GetByEventIdAsync(Guid eventId)
        {
            return await _context.EventParticipants
                .Include(ep => ep.User)
                .Where(ep => ep.EventId == eventId)
                .ToListAsync();
        }

        public async Task<List<Guid>> GetAcceptedParticipantIdsAsync(Guid eventId)
        {
            return await _context.EventParticipants
                .Where(ep => ep.EventId == eventId && ep.InvitationStatus == "accepted")
                .Select(ep => ep.UserId)
                .ToListAsync();
        }

        public async Task<EventParticipant> CreateAsync(EventParticipant participant)
        {
            _context.EventParticipants.Add(participant);
            await _context.SaveChangesAsync();
            return participant;
        }

        public async Task UpdateAsync(EventParticipant participant)
        {
            _context.EventParticipants.Update(participant);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(EventParticipant participant)
        {
            _context.EventParticipants.Remove(participant);
            await _context.SaveChangesAsync();
        }
    }
}





































































