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
    public class EventVoteRepository : IEventVoteRepository
    {
        private readonly BEESRSDBContext _context;

        public EventVoteRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<EventVote?> GetByEventOptionAndVoterAsync(Guid eventId, Guid optionId, Guid voterId)
        {
            return await _context.EventVotes
                .FirstOrDefaultAsync(ev => ev.EventId == eventId 
                    && ev.OptionId == optionId 
                    && ev.VoterId == voterId);
        }

        public async Task<List<EventVote>> GetByEventIdAsync(Guid eventId)
        {
            return await _context.EventVotes
                .Where(ev => ev.EventId == eventId)
                .Include(ev => ev.Voter)
                .ToListAsync();
        }

        public async Task<Dictionary<Guid, int>> GetVoteStatisticsAsync(Guid eventId)
        {
            return await _context.EventVotes
                .Where(ev => ev.EventId == eventId)
                .GroupBy(ev => ev.OptionId)
                .Select(g => new
                {
                    OptionId = g.Key,
                    TotalScore = g.Sum(v => v.VoteValue ?? 0)
                })
                .ToDictionaryAsync(x => x.OptionId, x => x.TotalScore);
        }

        public async Task<EventVote> CreateAsync(EventVote vote)
        {
            _context.EventVotes.Add(vote);
            await _context.SaveChangesAsync();
            return vote;
        }

        public async Task UpdateAsync(EventVote vote)
        {
            _context.EventVotes.Update(vote);
            await _context.SaveChangesAsync();
        }
    }
}



















































































