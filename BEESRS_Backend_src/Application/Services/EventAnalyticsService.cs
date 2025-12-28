using Application.Interfaces;
using Infrastructure.Interfaces;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Application.Services
{
    public class EventAnalyticsService : IEventAnalyticsService
    {
        private readonly IEventRepository _eventRepository;
        private readonly IEventParticipantRepository _participantRepository;
        private readonly IEventCheckInRepository _checkInRepository;
        private readonly IEventFeedbackRepository _feedbackRepository;
        private readonly IEventVoteRepository _voteRepository;
        private readonly IEventShareRepository _shareRepository;
        private readonly ILogger<EventAnalyticsService> _logger;

        public EventAnalyticsService(
            IEventRepository eventRepository,
            IEventParticipantRepository participantRepository,
            IEventCheckInRepository checkInRepository,
            IEventFeedbackRepository feedbackRepository,
            IEventVoteRepository voteRepository,
            IEventShareRepository shareRepository,
            ILogger<EventAnalyticsService> logger)
        {
            _eventRepository = eventRepository;
            _participantRepository = participantRepository;
            _checkInRepository = checkInRepository;
            _feedbackRepository = feedbackRepository;
            _voteRepository = voteRepository;
            _shareRepository = shareRepository;
            _logger = logger;
        }

        public async Task<EventAnalyticsDto> GetEventAnalyticsAsync(Guid eventId, Guid userId)
        {
            var eventEntity = await _eventRepository.GetByIdWithDetailsAsync(eventId);
            if (eventEntity == null)
                throw new Application.Exceptions.NotFoundException("Event not found");

            if (eventEntity.OrganizerId != userId)
                throw new UnauthorizedAccessException("Only organizer can view event analytics");

            var participants = eventEntity.EventParticipants?.ToList() ?? new List<Domain.Entities.EventParticipant>();
            var checkIns = await _checkInRepository.GetByEventIdAsync(eventId);
            var feedbacks = await _feedbackRepository.GetByEventIdAsync(eventId);
            var votes = eventEntity.EventVotes?.ToList() ?? new List<Domain.Entities.EventVote>();
            var shares = await _shareRepository.GetSharesByEventIdAsync(eventId);
            var sharesList = shares?.ToList() ?? new List<Domain.Entities.EventShare>();

            var totalInvited = participants.Count;
            var totalAccepted = participants.Count(p => p.InvitationStatus == "accepted");
            var totalDeclined = participants.Count(p => p.InvitationStatus == "declined");
            var totalPending = participants.Count(p => p.InvitationStatus == "pending");
            var totalCheckedIn = checkIns.Count;
            var totalNoShow = totalAccepted - totalCheckedIn;

            var acceptanceRate = totalInvited > 0 ? (double)totalAccepted / totalInvited * 100 : 0;
            var checkInRate = totalAccepted > 0 ? (double)totalCheckedIn / totalAccepted * 100 : 0;

            var avgVenueRating = feedbacks.Any() ? feedbacks.Average(f => f.VenueRating) : 0;
            var avgFoodRating = feedbacks.Any() ? feedbacks.Average(f => f.FoodRating) : 0;
            var avgOverallRating = feedbacks.Any() ? feedbacks.Average(f => f.OverallRating) : 0;
            var wouldAttendAgain = feedbacks.Any() ? (double)feedbacks.Count(f => f.WouldAttendAgain) / feedbacks.Count * 100 : 0;

            return new EventAnalyticsDto
            {
                EventId = eventId,
                EventTitle = eventEntity.Title,
                TotalInvited = totalInvited,
                TotalAccepted = totalAccepted,
                TotalDeclined = totalDeclined,
                TotalPending = totalPending,
                TotalCheckedIn = totalCheckedIn,
                TotalNoShow = totalNoShow,
                AcceptanceRate = acceptanceRate,
                CheckInRate = checkInRate,
                AverageVenueRating = avgVenueRating,
                AverageFoodRating = avgFoodRating,
                AverageOverallRating = avgOverallRating,
                TotalFeedbacks = feedbacks.Count,
                WouldAttendAgainPercentage = wouldAttendAgain,
                TotalVotes = votes.Count,
                TotalShares = sharesList.Count
            };
        }

        public async Task<OrganizerAnalyticsDto> GetOrganizerAnalyticsAsync(Guid organizerId, DateTime? startDate = null, DateTime? endDate = null)
        {
            var events = await _eventRepository.GetByOrganizerAsync(organizerId);

            if (startDate.HasValue)
                events = events.Where(e => e.ScheduledDate >= startDate.Value).ToList();
            if (endDate.HasValue)
                events = events.Where(e => e.ScheduledDate <= endDate.Value).ToList();

            var allParticipants = new List<Guid>();
            var totalParticipants = 0;
            var totalCheckedIn = 0;
            var allRatings = new List<double>();

            foreach (var evt in events)
            {
                var participants = evt.EventParticipants?.ToList() ?? new List<Domain.Entities.EventParticipant>();
                totalParticipants += participants.Count;
                allParticipants.AddRange(participants.Select(p => p.UserId));

                var checkIns = await _checkInRepository.GetByEventIdAsync(evt.EventId);
                totalCheckedIn += checkIns.Count;

                var feedbacks = await _feedbackRepository.GetByEventIdAsync(evt.EventId);
                if (feedbacks.Any())
                    allRatings.AddRange(feedbacks.Select(f => (double)f.OverallRating));
            }

            var uniqueParticipants = allParticipants.Distinct().Count();
            var avgAttendanceRate = events.Any() ? (double)totalCheckedIn / totalParticipants * 100 : 0;
            var avgRating = allRatings.Any() ? allRatings.Average() : 0;

            var eventsByType = events.GroupBy(e => e.EventType)
                .ToDictionary(g => g.Key, g => g.Count());

            var eventsByStatus = events.GroupBy(e => e.Status)
                .ToDictionary(g => g.Key, g => g.Count());

            return new OrganizerAnalyticsDto
            {
                OrganizerId = organizerId,
                TotalEvents = events.Count,
                CompletedEvents = events.Count(e => e.Status == "completed"),
                CancelledEvents = events.Count(e => e.Status == "cancelled"),
                UpcomingEvents = events.Count(e => e.Status == "confirmed" || e.Status == "voting"),
                AverageAttendanceRate = avgAttendanceRate,
                AverageRating = avgRating,
                TotalParticipants = totalParticipants,
                TotalUniqueParticipants = uniqueParticipants,
                EventsByType = eventsByType,
                EventsByStatus = eventsByStatus
            };
        }

        public async Task<List<EventTrendDto>> GetEventTrendsAsync(Guid organizerId, int months = 6)
        {
            var events = await _eventRepository.GetByOrganizerAsync(organizerId);
            var cutoffDate = DateTime.Now.AddMonths(-months);

            var monthlyData = events
                .Where(e => e.ScheduledDate >= cutoffDate)
                .GroupBy(e => new { e.ScheduledDate.Year, e.ScheduledDate.Month })
                .Select(g => new
                {
                    Month = $"{g.Key.Year}-{g.Key.Month:D2}",
                    Events = g.ToList()
                })
                .OrderBy(x => x.Month)
                .ToList();

            var trends = new List<EventTrendDto>();

            foreach (var monthData in monthlyData)
            {
                var monthEvents = monthData.Events;
                var participantCount = monthEvents.Sum(e => e.EventParticipants?.Count ?? 0);
                var allRatings = new List<double>();

                foreach (var evt in monthEvents)
                {
                    var feedbacks = await _feedbackRepository.GetByEventIdAsync(evt.EventId);
                    if (feedbacks.Any())
                        allRatings.AddRange(feedbacks.Select(f => (double)f.OverallRating));
                }

                trends.Add(new EventTrendDto
                {
                    Month = monthData.Month,
                    EventCount = monthEvents.Count,
                    ParticipantCount = participantCount,
                    AverageRating = allRatings.Any() ? allRatings.Average() : 0
                });
            }

            return trends;
        }

        public async Task<EventParticipationStatsDto> GetParticipationStatsAsync(Guid eventId, Guid userId)
        {
            var eventEntity = await _eventRepository.GetByIdWithDetailsAsync(eventId);
            if (eventEntity == null)
                throw new Application.Exceptions.NotFoundException("Event not found");

            if (eventEntity.OrganizerId != userId)
                throw new UnauthorizedAccessException("Only organizer can view participation stats");

            var participants = eventEntity.EventParticipants?
                .Where(p => p.InvitationStatus == "accepted")
                .ToList() ?? new List<Domain.Entities.EventParticipant>();

            var checkIns = await _checkInRepository.GetByEventIdAsync(eventId);
            var checkInUserIds = checkIns.Select(ci => ci.UserId).ToHashSet();

            var participantDetails = participants.Select(p => new ParticipantCheckInDto
            {
                UserId = p.UserId,
                UserName = p.User?.FullName ?? "Unknown",
                HasCheckedIn = checkInUserIds.Contains(p.UserId),
                CheckedInAt = checkIns.FirstOrDefault(ci => ci.UserId == p.UserId)?.CheckedInAt,
                IsNoShow = !checkInUserIds.Contains(p.UserId)
            }).ToList();

            var totalCheckedIn = checkIns.Count;
            var totalNoShow = participants.Count - totalCheckedIn;
            var checkInRate = participants.Any() ? (double)totalCheckedIn / participants.Count * 100 : 0;

            return new EventParticipationStatsDto
            {
                EventId = eventId,
                TotalParticipants = participants.Count,
                CheckedInCount = totalCheckedIn,
                NoShowCount = totalNoShow,
                CheckInRate = checkInRate,
                ParticipantDetails = participantDetails
            };
        }
    }
}

