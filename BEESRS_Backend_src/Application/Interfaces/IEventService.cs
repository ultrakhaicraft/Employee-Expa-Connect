using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Domain.Entities;
using Infrastructure.Models.Converstation;

namespace Application.Interfaces
{
    public interface IEventService
    {
        Task<Event> CreateEventAsync(Guid organizerId, Event eventEntity);
        Task<Event> UpdateEventAsync(Guid eventId, Event updatedEvent);
        Task<Event> GetEventByIdAsync(Guid eventId);
        Task<List<Event>> GetEventsByOrganizerAsync(Guid organizerId);
        Task<List<Event>> GetEventsByParticipantAsync(Guid userId);
        Task<bool> InviteParticipantsAsync(Guid eventId, List<Guid> userIds, Guid invitedBy);
        Task<bool> RequestToJoinAsync(Guid eventId, Guid userId);
        Task<bool> AcceptInvitationAsync(Guid eventId, Guid userId);
        Task<bool> DeclineInvitationAsync(Guid eventId, Guid userId);
        Task<bool> RemoveParticipantAsync(Guid eventId, Guid participantUserId, Guid organizerId);
        Task<int> GetAcceptedParticipantsCountAsync(Guid eventId);
        Task<bool> CancelEventAsync(Guid eventId, string reason);
        Task<bool> FinalizeEventAsync(Guid eventId, Guid optionId, Guid userId);
        Task<EventPlaceOption> AddManualPlaceOptionAsync(Guid eventId, Guid placeId, Guid userId);
        Task<EventPlaceOption> ConvertExternalPlaceToInternalAsync(Guid eventId, Guid optionId, Guid userId);
        Task<ConversationDto> GetOrCreateEventChatAsync(Guid eventId, Guid userId);
        Task<bool> RescheduleEventAsync(Guid eventId, Guid userId, DateTime newDate, TimeSpan newTime, string reason);
        Task<Domain.Entities.EventCheckIn?> GetCheckInByEventAndUserAsync(Guid eventId, Guid userId);
        Task<bool> CheckInEventAsync(Guid eventId, Guid userId, double? latitude = null, double? longitude = null, string checkInMethod = "manual");
        Task<EventFeedback> SubmitEventFeedbackAsync(Guid eventId, Guid userId, int venueRating, int foodRating, int overallRating, string? comments = null, string? suggestions = null, bool wouldAttendAgain = false);
        Task<EventFeedback?> GetFeedbackByEventAndUserAsync(Guid eventId, Guid userId);
        Task<EventFeedback> UpdateEventFeedbackAsync(Guid eventId, Guid userId, int venueRating, int foodRating, int overallRating, string? comments = null, string? suggestions = null, bool wouldAttendAgain = false);
        Task<EventTemplate> CreateEventTemplateAsync(Guid userId, EventTemplate template);
        Task<Event> CreateEventFromTemplateAsync(Guid templateId, Guid organizerId, DateTime scheduledDate, TimeSpan scheduledTime);
        Task<RecurringEvent> CreateRecurringEventAsync(Guid organizerId, RecurringEvent recurringEvent);
        Task<Domain.Entities.EventWaitlist?> GetWaitlistByEventAndUserAsync(Guid eventId, Guid userId);
        Task<bool> JoinEventWaitlistAsync(Guid eventId, Guid userId, int? priority = null, string? notes = null);
        Task<bool> PromoteFromWaitlistAsync(Guid eventId, Guid userId, Guid organizerId);
        Task<List<Event>> GetEventsByBranchIdAsync(Guid branchId);
        Task<Event> GetEventWithFullStatisticsAsync(Guid eventId);
        Task<bool> DeleteEventByModeratorAsync(Guid eventId, Guid moderatorId, string reason);
        Task<Infrastructure.Models.Common.UploadResultDto> AddEventImageAsync(Guid eventId, Microsoft.AspNetCore.Http.IFormFile imageFile, Guid senderId);
        Task<Infrastructure.Models.Common.PagedResult<Event>> GetBranchEventsSummaryAsync(Guid userId, Guid? branchId = null, string? timeFilter = null, string? statusFilter = null, int page = 1, int pageSize = 20);
    }
}














