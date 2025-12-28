using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.Entities;

namespace Application.Interfaces
{
    public interface IVoteService
    {
        Task<bool> CastVoteAsync(Guid eventId, Guid optionId, Guid voterId, int voteValue, string comment = null);
        Task<Dictionary<Guid, int>> GetVoteStatisticsAsync(Guid eventId);
        Task<Guid> CalculateWinningVenueAsync(Guid eventId);
    }
}



















































































