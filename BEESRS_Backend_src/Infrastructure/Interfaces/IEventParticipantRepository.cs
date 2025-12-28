using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IEventParticipantRepository
    {
        Task<EventParticipant?> GetByEventAndUserAsync(Guid eventId, Guid userId);
        Task<List<EventParticipant>> GetByEventIdAsync(Guid eventId);
        Task<List<Guid>> GetAcceptedParticipantIdsAsync(Guid eventId);
        Task<EventParticipant> CreateAsync(EventParticipant participant);
        Task UpdateAsync(EventParticipant participant);
        Task DeleteAsync(EventParticipant participant);
    }
}





































































