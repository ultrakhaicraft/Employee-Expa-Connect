using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IEventVoteRepository
    {
        Task<EventVote?> GetByEventOptionAndVoterAsync(Guid eventId, Guid optionId, Guid voterId);
        Task<List<EventVote>> GetByEventIdAsync(Guid eventId);
        Task<Dictionary<Guid, int>> GetVoteStatisticsAsync(Guid eventId);
        Task<EventVote> CreateAsync(EventVote vote);
        Task UpdateAsync(EventVote vote);
    }
}



















































































