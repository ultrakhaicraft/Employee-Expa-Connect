using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IEventShareRepository
    {
        Task<EventShare> CreateSingleAsync(EventShare eventShare);
        Task<EventShare?> GetByIdAsync(Guid shareId);
        Task DeleteAsync(EventShare eventShare);
        Task<IEnumerable<EventShare>> GetSharesByEventIdAsync(Guid eventId);
        Task<IEnumerable<EventShare>> GetSharedWithUserAsync(Guid userId);
        Task<EventShare?> GetShareByEventIdAndUserIdAsync(Guid eventId, Guid userId);
    }
}


















































































