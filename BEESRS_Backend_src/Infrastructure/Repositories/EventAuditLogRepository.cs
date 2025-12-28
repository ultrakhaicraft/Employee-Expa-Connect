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
    public class EventAuditLogRepository : IEventAuditLogRepository
    {
        private readonly BEESRSDBContext _context;

        public EventAuditLogRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<EventAuditLog> CreateAsync(EventAuditLog auditLog)
        {
            _context.EventAuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
            return auditLog;
        }

        public async Task<List<EventAuditLog>> GetByEventIdAsync(Guid eventId)
        {
            return await _context.EventAuditLogs
                .Where(log => log.EventId == eventId)
                .Include(log => log.ChangedByUser)
                .OrderByDescending(log => log.ChangedAt)
                .ToListAsync();
        }
    }
}



















































































