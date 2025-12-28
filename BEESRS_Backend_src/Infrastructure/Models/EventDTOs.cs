using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Infrastructure.Models
{
    // Request DTOs
    public class CreateEventRequest
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public string EventType { get; set; }
        public DateTime ScheduledDate { get; set; }
        public TimeSpan ScheduledTime { get; set; }
        public int ExpectedAttendees { get; set; }

        [Range(5, double.MaxValue, ErrorMessage = "Total Budget must be at least 5.")]
        public decimal? BudgetTotal { get; set; }
        public decimal? BudgetPerPerson { get; set; }
        public int? EstimatedDuration { get; set; }
        public string EventImageUrl { get; set; }
        
        /// <summary>
        /// Optional: If provided, organizer selects place directly and skips AI recommendation/voting flow.
        /// Event will be created with this place as FinalPlaceId and status set to "confirmed".
        /// If null, event follows normal flow (draft → planning → AI recommendation → voting → confirmed).
        /// </summary>
        public Guid? FinalPlaceId { get; set; }
        
        /// <summary>
        /// Optional: Acceptance threshold (0.0 to 1.0). Default is 0.7 (70%).
        /// Minimum percentage of participants that must accept invitations before proceeding to gathering preferences.
        /// </summary>
        [Range(0.0, 1.0, ErrorMessage = "Acceptance threshold must be between 0.0 and 1.0")]
        public decimal? AcceptanceThreshold { get; set; }
        
        /// <summary>
        /// Optional: Privacy setting. "Public" (default) or "Private".
        /// Public events are visible to all users in the branch.
        /// Private events are only visible to the organizer and invited participants.
        /// </summary>
        [StringLength(20)]
        public string Privacy { get; set; } = "Public";
    }

    public class UpdateEventRequest
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public string EventType { get; set; }
        public DateTime ScheduledDate { get; set; }
        public TimeSpan ScheduledTime { get; set; }
        public int ExpectedAttendees { get; set; }

        [Range(5, double.MaxValue, ErrorMessage = "Total Budget must be at least 5.")]
        public decimal? BudgetTotal { get; set; }
        public decimal? BudgetPerPerson { get; set; }
        public int? EstimatedDuration { get; set; }
        public string EventImageUrl { get; set; }
        
        /// <summary>
        /// Optional: Privacy setting. "Public" (default) or "Private".
        /// </summary>
        [StringLength(20)]
        public string Privacy { get; set; } = "Public";
    }

    public class InviteParticipantsRequest
    {
        [Required(ErrorMessage = "User IDs list is required")]
        [MinLength(1, ErrorMessage = "At least one user must be selected")]
        public List<Guid> UserIds { get; set; }
    }

    public class VoteRequest
    {
        public Guid OptionId { get; set; }
        public int VoteValue { get; set; }
        public string Comment { get; set; }
    }

    public class FinalizeEventRequest
    {
        public Guid OptionId { get; set; }
    }

    public class CancelEventRequest
    {
        [Required(ErrorMessage = "Cancellation reason is required")]
        [StringLength(500, MinimumLength = 10, ErrorMessage = "Reason must be between 10 and 500 characters")]
        public string Reason { get; set; }
    }

    public class AddPlaceOptionRequest
    {
        [Required(ErrorMessage = "PlaceId is required")]
        public Guid PlaceId { get; set; }
    }

    // Response DTOs
    public class EventResponse
    {
        public Guid EventId { get; set; }
        public Guid OrganizerId { get; set; }
        public string OrganizerName { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string EventType { get; set; }
        public DateTime ScheduledDate { get; set; }
        public TimeSpan ScheduledTime { get; set; }
        public string Timezone { get; set; } // Timezone of the event (e.g., "UTC+07:00") for frontend to convert
        public int? EstimatedDuration { get; set; }
        public int ExpectedAttendees { get; set; }
        public decimal? AcceptanceThreshold { get; set; } // Acceptance threshold (0.0 to 1.0, default 0.7 = 70%)
        public decimal? BudgetTotal { get; set; }
        public decimal? BudgetPerPerson { get; set; }
        public string Status { get; set; }
        public DateTimeOffset? VotingDeadline { get; set; }
        public Guid? FinalPlaceId { get; set; }
        public string FinalPlaceName { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? ConfirmedAt { get; set; }
        public DateTimeOffset? CompletedAt { get; set; }
        public DateTimeOffset? AiAnalysisStartedAt { get; set; }
        public string AiAnalysisProgress { get; set; } // JSON string
        public string EventImageUrl { get; set; } // Event avatar/cover image URL
        public string Privacy { get; set; } = "Public"; // "Public" or "Private"
        public int AcceptedCount { get; set; }
        public int InvitedCount { get; set; }
        public List<ParticipantResponse> Participants { get; set; }
    }

    public class ParticipantResponse
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string InvitationStatus { get; set; }
        public DateTimeOffset? RsvpDate { get; set; }
        public string ProfilePictureUrl { get; set; }
    }

    public class VenueOptionResponse
    {
        public Guid OptionId { get; set; }
        
        // Internal Place (if exists in system)
        public Guid? PlaceId { get; set; } // ✅ Nullable - null for external providers
        public string PlaceName { get; set; }
        public string PlaceAddress { get; set; }
        public string PlaceCategory { get; set; }
        public decimal? AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public double? PlaceLatitude { get; set; } // For distance calculation
        public double? PlaceLongitude { get; set; } // For distance calculation
        public string PlaceImageUrl { get; set; } // Primary image URL for internal places
        
        // External Provider Data (for TrackAsia, Google Maps, etc.)
        public string ExternalProvider { get; set; } // e.g., "TrackAsia"
        public string ExternalPlaceId { get; set; }
        public string ExternalPlaceName { get; set; }
        public string ExternalAddress { get; set; }
        public double? ExternalLatitude { get; set; }
        public double? ExternalLongitude { get; set; }
        public decimal? ExternalRating { get; set; }
        public int? ExternalTotalReviews { get; set; }
        public string ExternalPhoneNumber { get; set; }
        public string ExternalWebsite { get; set; }
        public string ExternalPhotoUrl { get; set; }
        public string ExternalCategory { get; set; }
        
        // AI Analysis (common for both internal and external)
        public decimal? AiScore { get; set; }
        public string AiReasoning { get; set; }
        public List<string> Pros { get; set; }
        public List<string> Cons { get; set; }
        public decimal? EstimatedCostPerPerson { get; set; }
        
        // Voting Data
        public int TotalVotes { get; set; }
        public int VoteScore { get; set; }
        
        // Place Verification Status (only for internal places)
        public string VerificationStatus { get; set; } // "Pending", "Approved", "Rejected", or null for external places
    }

    public class VoteStatisticsResponse
    {
        public int TotalParticipants { get; set; }
        public int VotedCount { get; set; }
        public double VoteProgress { get; set; }
        public List<VenueVoteCount> VenueVotes { get; set; }
        public TimeSpan? TimeRemaining { get; set; }
    }

    public class VenueVoteCount
    {
        public Guid OptionId { get; set; }
        public string VenueName { get; set; }
        public int VoteCount { get; set; }
        public int VoteScore { get; set; }
    }

    public class EventProgressResponse
    {
        public string CurrentState { get; set; }
        public List<string> CompletedSteps { get; set; }
        public string NextStep { get; set; }
        public double ProgressPercentage { get; set; }
    }
}














