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
    public class RecurringEventRepository : IRecurringEventRepository
    {
        private readonly BEESRSDBContext _context;

        public RecurringEventRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<RecurringEvent> CreateAsync(RecurringEvent recurringEvent)
        {
            _context.RecurringEvents.Add(recurringEvent);
            await _context.SaveChangesAsync();
            return recurringEvent;
        }

        public async Task<RecurringEvent?> GetByIdAsync(Guid recurringEventId)
        {
            return await _context.RecurringEvents
                .FirstOrDefaultAsync(re => re.RecurringEventId == recurringEventId);
        }

        public async Task<RecurringEvent?> GetByIdWithDetailsAsync(Guid recurringEventId)
        {
            return await _context.RecurringEvents
                .Include(re => re.Organizer)
                .Include(re => re.GeneratedEvents)
                .FirstOrDefaultAsync(re => re.RecurringEventId == recurringEventId);
        }

        public async Task<List<RecurringEvent>> GetByOrganizerIdAsync(Guid organizerId)
        {
            return await _context.RecurringEvents
                .Where(re => re.OrganizerId == organizerId)
                .OrderByDescending(re => re.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<RecurringEvent>> GetActiveRecurringEventsAsync()
        {
            return await _context.RecurringEvents
                .Where(re => re.Status == "active" && re.AutoCreateEvents)
                .ToListAsync();
        }

        public async Task UpdateAsync(RecurringEvent recurringEvent)
        {
            recurringEvent.UpdatedAt = DateTimeOffset.UtcNow;
            _context.RecurringEvents.Update(recurringEvent);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid recurringEventId)
        {
            var recurringEvent = await _context.RecurringEvents.FindAsync(recurringEventId);
            if (recurringEvent != null)
            {
                _context.RecurringEvents.Remove(recurringEvent);
                await _context.SaveChangesAsync();
            }
        }
    }
}

