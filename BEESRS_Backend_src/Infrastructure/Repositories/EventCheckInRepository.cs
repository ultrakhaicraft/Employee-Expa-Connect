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
    public class EventCheckInRepository : IEventCheckInRepository
    {
        private readonly BEESRSDBContext _context;

        public EventCheckInRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<EventCheckIn> CreateAsync(EventCheckIn checkIn)
        {
            _context.EventCheckIns.Add(checkIn);
            await _context.SaveChangesAsync();
            return checkIn;
        }

        public async Task<EventCheckIn?> GetByEventAndUserAsync(Guid eventId, Guid userId)
        {
            return await _context.EventCheckIns
                .FirstOrDefaultAsync(ci => ci.EventId == eventId && ci.UserId == userId);
        }

        public async Task<List<EventCheckIn>> GetByEventIdAsync(Guid eventId)
        {
            return await _context.EventCheckIns
                .Include(ci => ci.User)
                .Where(ci => ci.EventId == eventId)
                .OrderBy(ci => ci.CheckedInAt)
                .ToListAsync();
        }

        public async Task UpdateAsync(EventCheckIn checkIn)
        {
            _context.EventCheckIns.Update(checkIn);
            await _context.SaveChangesAsync();
        }
    }
}

