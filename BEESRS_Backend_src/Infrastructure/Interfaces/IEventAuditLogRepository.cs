using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IEventAuditLogRepository
    {
        Task<EventAuditLog> CreateAsync(EventAuditLog auditLog);
        Task<List<EventAuditLog>> GetByEventIdAsync(Guid eventId);
    }
}



















































































