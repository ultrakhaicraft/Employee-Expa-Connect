using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Application.Models;
using Domain.Entities;

namespace Application.Interfaces.ThirdParty
{
    public interface IGeminiAIService
    {
        Task<GeminiRecommendationResult> AnalyzeVenuesAsync(
            List<Place> venues,
            AggregatedPreferences preferences,
            Event eventDetails,
            List<(double Latitude, double Longitude)> participantLocations);

        Task<string> GenerateDetailedReasoningAsync(
            Place venue,
            AggregatedPreferences preferences,
            Event eventDetails,
            double score);
    }

    public class GeminiRecommendationResult
    {
        public List<GeminiVenueAnalysis> VenueAnalyses { get; set; }
        public string OverallInsight { get; set; }
        /// <summary>
        /// Category name phù hợp cho event này (từ PlaceCategory.Name trong database)
        /// Ví dụ: "restaurant", "cafe", "bar", "bakery"
        /// </summary>
        public string SuggestedEventCategory { get; set; }
        /// <summary>
        /// List các tag names phù hợp cho event này (từ PlaceTag.Name trong database)
        /// Ví dụ: ["cozy", "outdoor seating", "vegetarian-friendly"]
        /// </summary>
        public List<string> SuggestedEventTags { get; set; }
    }

    public class GeminiVenueAnalysis
    {
        public Guid PlaceId { get; set; }
        public string VenueName { get; set; }
        public double AdjustedScore { get; set; }
        public string DetailedReasoning { get; set; }
        public List<string> Pros { get; set; }
        public List<string> Cons { get; set; }
        public string TeamFitAnalysis { get; set; }
        public List<string> SpecialConsiderations { get; set; }
        /// <summary>
        /// Category name được đề xuất cho venue này (từ PlaceCategory.Name trong database)
        /// </summary>
        public string SuggestedCategory { get; set; }
        /// <summary>
        /// List các tag names được đề xuất cho venue này (từ PlaceTag.Name trong database)
        /// </summary>
        public List<string> SuggestedPlaceTags { get; set; }
    }
}

