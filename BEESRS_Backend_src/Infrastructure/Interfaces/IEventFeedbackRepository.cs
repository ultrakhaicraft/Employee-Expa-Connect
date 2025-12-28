using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IEventFeedbackRepository
    {
        Task<EventFeedback> CreateAsync(EventFeedback feedback);
        Task<EventFeedback?> GetByEventAndUserAsync(Guid eventId, Guid userId);
        Task<List<EventFeedback>> GetByEventIdAsync(Guid eventId);
        Task UpdateAsync(EventFeedback feedback);
    }
}

