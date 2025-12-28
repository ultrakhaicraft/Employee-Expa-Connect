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
    public class EventPlaceOptionRepository : IEventPlaceOptionRepository
    {
        private readonly BEESRSDBContext _context;

        public EventPlaceOptionRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<EventPlaceOption?> GetByIdAsync(Guid optionId)
        {
            return await _context.EventPlaceOptions
                .Include(epo => epo.Place)
                .FirstOrDefaultAsync(epo => epo.OptionId == optionId);
        }

        public async Task<List<EventPlaceOption>> GetByEventIdAsync(Guid eventId)
        {
            return await _context.EventPlaceOptions
                .Include(epo => epo.Place)
                    .ThenInclude(p => p.PlaceCategory)
                .Where(epo => epo.EventId == eventId)
                .OrderByDescending(epo => epo.AiScore)
                .ToListAsync();
        }

        public async Task<EventPlaceOption> CreateAsync(EventPlaceOption option)
        {
            _context.EventPlaceOptions.Add(option);
            await _context.SaveChangesAsync();
            return option;
        }

        public async Task<int> UpdateAsync(EventPlaceOption option)
        {
            _context.EventPlaceOptions.Update(option);
            return await _context.SaveChangesAsync();
        }

        public async Task<int> GetRecommendationCountAsync(Guid eventId)
        {
            return await _context.EventPlaceOptions
                .CountAsync(epo => epo.EventId == eventId);
        }
    }
}









































