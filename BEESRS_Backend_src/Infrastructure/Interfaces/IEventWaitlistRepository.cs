using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IEventWaitlistRepository
    {
        Task<EventWaitlist> CreateAsync(EventWaitlist waitlist);
        Task<EventWaitlist?> GetByEventAndUserAsync(Guid eventId, Guid userId);
        Task<List<EventWaitlist>> GetByEventIdAsync(Guid eventId);
        Task<List<EventWaitlist>> GetByUserIdAsync(Guid userId);
        Task<List<EventWaitlist>> GetWaitingListByEventIdAsync(Guid eventId);
        Task UpdateAsync(EventWaitlist waitlist);
        Task DeleteAsync(Guid waitlistId);
        Task<int> GetWaitlistCountAsync(Guid eventId);
    }
}

