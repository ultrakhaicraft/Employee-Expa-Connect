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
    public class EventShareRepository : IEventShareRepository
    {
        private readonly BEESRSDBContext _context;

        public EventShareRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<EventShare> CreateSingleAsync(EventShare eventShare)
        {
            _context.EventShares.Add(eventShare);
            await _context.SaveChangesAsync();
            return eventShare;
        }

        public async Task<EventShare?> GetByIdAsync(Guid shareId)
        {
            return await _context.EventShares
                .Include(s => s.SharedWithUser)
                .Include(s => s.SharedByUser)
                .Include(s => s.Event)
                .FirstOrDefaultAsync(s => s.ShareId == shareId);
        }

        public async Task DeleteAsync(EventShare eventShare)
        {
            _context.EventShares.Remove(eventShare);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<EventShare>> GetSharesByEventIdAsync(Guid eventId)
        {
            return await _context.EventShares
                .Include(s => s.SharedWithUser)
                .Include(s => s.SharedByUser)
                .Where(s => s.EventId == eventId)
                .ToListAsync();
        }

        public async Task<IEnumerable<EventShare>> GetSharedWithUserAsync(Guid userId)
        {
            return await _context.EventShares
                .Include(s => s.Event)
                .Include(s => s.SharedByUser)
                .Where(s => s.SharedWithUserId == userId)
                .ToListAsync();
        }

        public async Task<EventShare?> GetShareByEventIdAndUserIdAsync(Guid eventId, Guid userId)
        {
            return await _context.EventShares
                .FirstOrDefaultAsync(s => s.EventId == eventId && s.SharedWithUserId == userId);
        }
    }
}


















































































