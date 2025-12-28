using Domain.Entities;
using Infrastructure.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Infrastructure.Repositories
{
    public class EventTemplateRepository : IEventTemplateRepository
    {
        private readonly BEESRSDBContext _context;

        public EventTemplateRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<EventTemplate> CreateAsync(EventTemplate template)
        {
            _context.EventTemplates.Add(template);
            await _context.SaveChangesAsync();
            return template;
        }

        public async Task<EventTemplate?> GetByIdAsync(Guid templateId)
        {
            return await _context.EventTemplates
                .Include(t => t.CreatedByUser)
                .FirstOrDefaultAsync(t => t.TemplateId == templateId);
        }

        public async Task<List<EventTemplate>> GetByUserIdAsync(Guid userId)
        {
            return await _context.EventTemplates
                .Where(t => t.CreatedBy == userId)
                .OrderByDescending(t => t.IsDefault)
                .ThenByDescending(t => t.UsageCount)
                .ThenByDescending(t => t.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<EventTemplate>> GetPublicTemplatesAsync()
        {
            return await _context.EventTemplates
                .Where(t => t.IsPublic)
                .OrderByDescending(t => t.IsDefault)
                .ThenByDescending(t => t.UsageCount)
                .ToListAsync();
        }

        public async Task<List<EventTemplate>> GetAllTemplatesAsync()
        {
            return await _context.EventTemplates
                .OrderByDescending(t => t.IsDefault)
                .ThenByDescending(t => t.UsageCount)
                .ThenByDescending(t => t.CreatedAt)
                .ToListAsync();
        }

        public async Task UpdateAsync(EventTemplate template)
        {
            template.UpdatedAt = DateTimeOffset.UtcNow;
            _context.EventTemplates.Update(template);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid templateId)
        {
            var template = await _context.EventTemplates.FindAsync(templateId);
            if (template != null)
            {
                _context.EventTemplates.Remove(template);
                await _context.SaveChangesAsync();
            }
        }

        public async Task IncrementUsageCountAsync(Guid templateId)
        {
            var template = await _context.EventTemplates.FindAsync(templateId);
            if (template != null)
            {
                template.UsageCount++;
                template.UpdatedAt = DateTimeOffset.UtcNow;
                await _context.SaveChangesAsync();
            }
        }
    }
}

