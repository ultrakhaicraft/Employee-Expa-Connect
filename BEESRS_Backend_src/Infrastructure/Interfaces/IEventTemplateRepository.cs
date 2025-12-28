using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IEventTemplateRepository
    {
        Task<EventTemplate> CreateAsync(EventTemplate template);
        Task<EventTemplate?> GetByIdAsync(Guid templateId);
        Task<List<EventTemplate>> GetByUserIdAsync(Guid userId);
        Task<List<EventTemplate>> GetPublicTemplatesAsync();
        Task<List<EventTemplate>> GetAllTemplatesAsync();
        Task UpdateAsync(EventTemplate template);
        Task DeleteAsync(Guid templateId);
        Task IncrementUsageCountAsync(Guid templateId);
    }
}

