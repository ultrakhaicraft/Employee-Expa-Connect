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
    public class EventFeedbackRepository : IEventFeedbackRepository
    {
        private readonly BEESRSDBContext _context;

        public EventFeedbackRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<EventFeedback> CreateAsync(EventFeedback feedback)
        {
            _context.EventFeedbacks.Add(feedback);
            await _context.SaveChangesAsync();
            return feedback;
        }

        public async Task<EventFeedback?> GetByEventAndUserAsync(Guid eventId, Guid userId)
        {
            return await _context.EventFeedbacks
                .FirstOrDefaultAsync(f => f.EventId == eventId && f.UserId == userId);
        }

        public async Task<List<EventFeedback>> GetByEventIdAsync(Guid eventId)
        {
            return await _context.EventFeedbacks
                .Include(f => f.User)
                .Where(f => f.EventId == eventId)
                .OrderByDescending(f => f.SubmittedAt)
                .ToListAsync();
        }

        public async Task UpdateAsync(EventFeedback feedback)
        {
            _context.EventFeedbacks.Update(feedback);
            await _context.SaveChangesAsync();
        }
    }
}

