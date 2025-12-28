using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IEventRepository
    {
        Task<Event?> GetByIdAsync(Guid eventId);
        Task<Event?> GetByIdWithDetailsAsync(Guid eventId);
        Task<List<Event>> GetByOrganizerAsync(Guid organizerId);
        Task<List<Event>> GetByParticipantAsync(Guid userId);
        Task<Event> CreateAsync(Event eventEntity);
        Task UpdateAsync(Event eventEntity);
        Task<int> GetAcceptedParticipantsCountAsync(Guid eventId);
        Task<List<Event>> GetEventsToCompleteAsync();
        Task<List<Event>> GetUpcomingEventsAsync(DateTimeOffset startTime, DateTimeOffset endTime, string[] statuses);
        Task<List<Event>> GetEventsWithVotingDeadlineAsync(DateTimeOffset startTime, DateTimeOffset endTime);
        Task<List<Event>> GetEventsWithRsvpDeadlineAsync(DateTimeOffset startTime, DateTimeOffset endTime);
        Task<List<Event>> GetEventsByBranchIdAsync(Guid branchId);
        Task<Event?> GetByIdWithFullStatisticsAsync(Guid eventId);
        Task AddEventImageAsync(Guid eventId, string imageUrl);
        Task<List<Event>> GetOverlappingEventsAsync(Guid organizerId, DateTime scheduledDate, TimeSpan scheduledTime, int? estimatedDuration, Guid? excludeEventId = null);
        Task<List<Event>> GetEventsByBranchWithPrivacyAsync(Guid branchId, Guid userId, string? timeFilter = null, string? statusFilter = null, int page = 1, int pageSize = 20);
        Task<int> GetEventsByBranchWithPrivacyCountAsync(Guid branchId, Guid userId, string? timeFilter = null, string? statusFilter = null);
        Task<List<Event>> GetEventsWithExpiredRsvpAndInsufficientParticipantsAsync();
    }
}















