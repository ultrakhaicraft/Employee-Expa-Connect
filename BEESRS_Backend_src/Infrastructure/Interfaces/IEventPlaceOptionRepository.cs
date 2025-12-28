using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IEventPlaceOptionRepository
    {
        Task<EventPlaceOption?> GetByIdAsync(Guid optionId);
        Task<List<EventPlaceOption>> GetByEventIdAsync(Guid eventId);
        Task<EventPlaceOption> CreateAsync(EventPlaceOption option);
        Task<int> UpdateAsync(EventPlaceOption option);
        Task<int> GetRecommendationCountAsync(Guid eventId);
    }
}









































