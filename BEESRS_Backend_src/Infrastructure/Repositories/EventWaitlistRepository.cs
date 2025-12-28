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
    public class EventWaitlistRepository : IEventWaitlistRepository
    {
        private readonly BEESRSDBContext _context;

        public EventWaitlistRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<EventWaitlist> CreateAsync(EventWaitlist waitlist)
        {
            _context.EventWaitlists.Add(waitlist);
            await _context.SaveChangesAsync();
            return waitlist;
        }

        public async Task<EventWaitlist?> GetByEventAndUserAsync(Guid eventId, Guid userId)
        {
            return await _context.EventWaitlists
                .FirstOrDefaultAsync(w => w.EventId == eventId && w.UserId == userId);
        }

        public async Task<List<EventWaitlist>> GetByEventIdAsync(Guid eventId)
        {
            return await _context.EventWaitlists
                .Include(w => w.User)
                .Where(w => w.EventId == eventId)
                .OrderByDescending(w => w.Priority)
                .ThenBy(w => w.JoinedAt)
                .ToListAsync();
        }

        public async Task<List<EventWaitlist>> GetByUserIdAsync(Guid userId)
        {
            return await _context.EventWaitlists
                .Include(w => w.Event)
                .Where(w => w.UserId == userId)
                .OrderByDescending(w => w.JoinedAt)
                .ToListAsync();
        }

        public async Task<List<EventWaitlist>> GetWaitingListByEventIdAsync(Guid eventId)
        {
            return await _context.EventWaitlists
                .Include(w => w.User)
                .Where(w => w.EventId == eventId && w.Status == "waiting")
                .OrderByDescending(w => w.Priority)
                .ThenBy(w => w.JoinedAt)
                .ToListAsync();
        }

        public async Task UpdateAsync(EventWaitlist waitlist)
        {
            _context.EventWaitlists.Update(waitlist);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid waitlistId)
        {
            var waitlist = await _context.EventWaitlists.FindAsync(waitlistId);
            if (waitlist != null)
            {
                _context.EventWaitlists.Remove(waitlist);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<int> GetWaitlistCountAsync(Guid eventId)
        {
            return await _context.EventWaitlists
                .CountAsync(w => w.EventId == eventId && w.Status == "waiting");
        }
    }
}

