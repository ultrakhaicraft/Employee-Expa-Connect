using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.Entities;

namespace Application.Interfaces
{
    public interface IAuditLogService
    {
        Task LogStateTransitionAsync(Guid eventId, string oldStatus, string newStatus, string reason = null);
        Task<List<EventAuditLog>> GetAuditLogsAsync(Guid eventId);
    }
}



















































































