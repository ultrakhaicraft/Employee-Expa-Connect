using System;
using System.Collections.Generic;

namespace Infrastructure.Models.Common
{
    public class ModeratorAnalyticsDto
    {
        public UserAnalytics UserStats { get; set; } = new();
        public EventAnalytics EventStats { get; set; } = new();
        public PlaceAnalytics PlaceStats { get; set; } = new();
        public List<MonthlyTrend> ActivityTrends { get; set; } = new();
    }

    public class UserAnalytics
    {
        public int TotalUsers { get; set; }
        public int ActiveUsers { get; set; }
        public int InactiveUsers { get; set; }
        public List<RoleDistribution> RoleDistribution { get; set; } = new();
    }

    public class RoleDistribution
    {
        public string RoleName { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class EventAnalytics
    {
        public int TotalEvents { get; set; }
        public int UpcomingEvents { get; set; }
        public int CompletedEvents { get; set; }
        public int CancelledEvents { get; set; }
        public List<StatusDistribution> StatusDistribution { get; set; } = new();
        public List<TypeDistribution> TypeDistribution { get; set; } = new();
    }

    public class StatusDistribution
    {
        public string Status { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class TypeDistribution
    {
        public string Type { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class PlaceAnalytics
    {
        public int TotalPlaces { get; set; }
        public int VerifiedPlaces { get; set; }
        public int PendingPlaces { get; set; }
        public int ReportedPlaces { get; set; }
        public List<TopPlaceDto> TopRatedPlaces { get; set; } = new();
    }

    public class TopPlaceDto
    {
        public Guid PlaceId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Rating { get; set; }
        public int TotalReviews { get; set; }
    }

    public class MonthlyTrend
    {
        public string Month { get; set; } = string.Empty;
        public int EventCount { get; set; }
        public int UserRegistrationCount { get; set; }
    }
}

