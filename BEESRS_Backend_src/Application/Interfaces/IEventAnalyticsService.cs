using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IEventAnalyticsService
    {
        Task<EventAnalyticsDto> GetEventAnalyticsAsync(Guid eventId, Guid userId);
        Task<OrganizerAnalyticsDto> GetOrganizerAnalyticsAsync(Guid organizerId, DateTime? startDate = null, DateTime? endDate = null);
        Task<List<EventTrendDto>> GetEventTrendsAsync(Guid organizerId, int months = 6);
        Task<EventParticipationStatsDto> GetParticipationStatsAsync(Guid eventId, Guid userId);
    }

    public class EventAnalyticsDto
    {
        public Guid EventId { get; set; }
        public string EventTitle { get; set; }
        public int TotalInvited { get; set; }
        public int TotalAccepted { get; set; }
        public int TotalDeclined { get; set; }
        public int TotalPending { get; set; }
        public int TotalCheckedIn { get; set; }
        public int TotalNoShow { get; set; }
        public double AcceptanceRate { get; set; }
        public double CheckInRate { get; set; }
        public double AverageVenueRating { get; set; }
        public double AverageFoodRating { get; set; }
        public double AverageOverallRating { get; set; }
        public int TotalFeedbacks { get; set; }
        public double WouldAttendAgainPercentage { get; set; }
        public int TotalVotes { get; set; }
        public int TotalShares { get; set; }
    }

    public class OrganizerAnalyticsDto
    {
        public Guid OrganizerId { get; set; }
        public int TotalEvents { get; set; }
        public int CompletedEvents { get; set; }
        public int CancelledEvents { get; set; }
        public int UpcomingEvents { get; set; }
        public double AverageAttendanceRate { get; set; }
        public double AverageRating { get; set; }
        public int TotalParticipants { get; set; }
        public int TotalUniqueParticipants { get; set; }
        public Dictionary<string, int> EventsByType { get; set; } = new Dictionary<string, int>();
        public Dictionary<string, int> EventsByStatus { get; set; } = new Dictionary<string, int>();
    }

    public class EventTrendDto
    {
        public string Month { get; set; }
        public int EventCount { get; set; }
        public int ParticipantCount { get; set; }
        public double AverageRating { get; set; }
    }

    public class EventParticipationStatsDto
    {
        public Guid EventId { get; set; }
        public int TotalParticipants { get; set; }
        public int CheckedInCount { get; set; }
        public int NoShowCount { get; set; }
        public double CheckInRate { get; set; }
        public List<ParticipantCheckInDto> ParticipantDetails { get; set; } = new List<ParticipantCheckInDto>();
    }

    public class ParticipantCheckInDto
    {
        public Guid UserId { get; set; }
        public string UserName { get; set; }
        public bool HasCheckedIn { get; set; }
        public DateTimeOffset? CheckedInAt { get; set; }
        public bool IsNoShow { get; set; }
    }
}

