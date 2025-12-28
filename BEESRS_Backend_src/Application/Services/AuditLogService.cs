using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Interfaces;

namespace Application.Services
{
    public class AuditLogService : IAuditLogService
    {
        private readonly IEventAuditLogRepository _auditLogRepository;

        public AuditLogService(IEventAuditLogRepository auditLogRepository)
        {
            _auditLogRepository = auditLogRepository;
        }

        public async Task LogStateTransitionAsync(Guid eventId, string oldStatus, string newStatus, string reason = null)
        {
            // Reason is required in database, provide default if null
            var reasonValue = string.IsNullOrWhiteSpace(reason) 
                ? $"Status changed from {oldStatus} to {newStatus}" 
                : reason;

            var auditLog = new EventAuditLog
            {
                EventId = eventId,
                OldStatus = oldStatus ?? "unknown",
                NewStatus = newStatus ?? "unknown",
                Reason = reasonValue,
                ChangedAt = DateTimeOffset.Now,
                AdditionalData = "{}" // Default empty JSON object to satisfy non-nullable constraint
            };

            await _auditLogRepository.CreateAsync(auditLog);
        }

        public async Task<List<EventAuditLog>> GetAuditLogsAsync(Guid eventId)
        {
            return await _auditLogRepository.GetByEventIdAsync(eventId);
        }
    }
}

