using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Interfaces;

namespace Application.Services
{
    public class EventStateMachine : IEventStateMachine
    {
        private readonly IEventRepository _eventRepository;
        private readonly IEventParticipantRepository _participantRepository;
        private readonly IEventPlaceOptionRepository _optionRepository;
        private readonly IAuditLogService _auditLogService;

        private static readonly Dictionary<string, List<string>> ValidTransitions = new Dictionary<string, List<string>>
        {
            { "draft", new List<string> { "planning", "cancelled" } },
            { "planning", new List<string> { "inviting", "cancelled" } },
            { "inviting", new List<string> { "gathering_preferences", "confirmed", "cancelled" } },
            { "gathering_preferences", new List<string> { "ai_recommending", "cancelled" } },
            { "ai_recommending", new List<string> { "voting", "cancelled" } },
            { "voting", new List<string> { "confirmed", "cancelled" } },
            { "confirmed", new List<string> { "completed", "cancelled" } },
            { "completed", new List<string>() },
            { "cancelled", new List<string>() }
        };

        public EventStateMachine(
            IEventRepository eventRepository,
            IEventParticipantRepository participantRepository,
            IEventPlaceOptionRepository optionRepository,
            IAuditLogService auditLogService)
        {
            _eventRepository = eventRepository;
            _participantRepository = participantRepository;
            _optionRepository = optionRepository;
            _auditLogService = auditLogService;
        }

        public async Task<bool> CanTransitionAsync(Event eventEntity, string newStatus)
        {
            if (!ValidTransitions.ContainsKey(eventEntity.Status))
                return false;

            return ValidTransitions[eventEntity.Status].Contains(newStatus);
        }

        public async Task<bool> ValidateTransitionAsync(Event eventEntity, string newStatus)
        {
            if (!await CanTransitionAsync(eventEntity, newStatus))
                return false;

            // Additional validation based on state
            switch (newStatus)
            {
                case "inviting":
                    // Validate all required fields are filled
                    return !string.IsNullOrEmpty(eventEntity.Title) 
                        && !string.IsNullOrEmpty(eventEntity.EventType)
                        && eventEntity.ScheduledDate > DateTime.MinValue;

                case "gathering_preferences":
                    // Check if enough participants accepted (using event's custom threshold or default 70%)
                    var acceptedCount = await _eventRepository.GetAcceptedParticipantsCountAsync(eventEntity.EventId);
                    var threshold = (double)(eventEntity.AcceptanceThreshold ?? 0.7m);
                    return acceptedCount >= (eventEntity.ExpectedAttendees * threshold);

                case "voting":
                    // Check if recommendations are generated (at least 1 recommendation required)
                    var recommendationCount = await _optionRepository.GetRecommendationCountAsync(eventEntity.EventId);
                    return recommendationCount >= 1;

                default:
                    return true;
            }
        }

        public async Task TransitionToAsync(Event eventEntity, string newStatus, string reason = null)
        {
            if (!await ValidateTransitionAsync(eventEntity, newStatus))
            {
                throw new InvalidOperationException(
                    $"Cannot transition from {eventEntity.Status} to {newStatus}");
            }

            var oldStatus = eventEntity.Status;
            eventEntity.Status = newStatus;
            eventEntity.UpdatedAt = DateTimeOffset.Now;

            // Update state-specific fields
            switch (newStatus)
            {
                case "ai_recommending":
                    eventEntity.AiAnalysisStartedAt = DateTimeOffset.Now;
                    break;
                case "voting":
                    eventEntity.VotingDeadline = DateTimeOffset.Now.AddDays(3);
                    break;
                case "confirmed":
                    eventEntity.ConfirmedAt = DateTimeOffset.Now;
                    break;
                case "cancelled":
                    eventEntity.CancelledAt = DateTimeOffset.Now;
                    eventEntity.CancellationReason = reason;
                    break;
                case "completed":
                    eventEntity.CompletedAt = DateTimeOffset.Now;
                    break;
            }

            await _eventRepository.UpdateAsync(eventEntity);

            // Log state transition
            await _auditLogService.LogStateTransitionAsync(
                eventEntity.EventId, 
                oldStatus, 
                newStatus, 
                reason);
        }
    }
}

