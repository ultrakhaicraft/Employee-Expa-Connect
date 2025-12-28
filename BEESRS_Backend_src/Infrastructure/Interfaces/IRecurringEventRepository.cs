using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IRecurringEventRepository
    {
        Task<RecurringEvent> CreateAsync(RecurringEvent recurringEvent);
        Task<RecurringEvent?> GetByIdAsync(Guid recurringEventId);
        Task<RecurringEvent?> GetByIdWithDetailsAsync(Guid recurringEventId);
        Task<List<RecurringEvent>> GetByOrganizerIdAsync(Guid organizerId);
        Task<List<RecurringEvent>> GetActiveRecurringEventsAsync();
        Task UpdateAsync(RecurringEvent recurringEvent);
        Task DeleteAsync(Guid recurringEventId);
    }
}

