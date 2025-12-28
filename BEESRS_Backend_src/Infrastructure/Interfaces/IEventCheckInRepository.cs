using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IEventCheckInRepository
    {
        Task<EventCheckIn> CreateAsync(EventCheckIn checkIn);
        Task<EventCheckIn?> GetByEventAndUserAsync(Guid eventId, Guid userId);
        Task<List<EventCheckIn>> GetByEventIdAsync(Guid eventId);
        Task UpdateAsync(EventCheckIn checkIn);
    }
}

