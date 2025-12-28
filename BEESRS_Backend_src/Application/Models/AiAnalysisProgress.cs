using System;
using System.Collections.Generic;

namespace Application.Models
{
    public class AiAnalysisProgress
    {
        public int CurrentStep { get; set; } // 1-5
        public string CurrentStepName { get; set; }
        public double ProgressPercentage { get; set; }
        
        // Step 1: Gathering Preferences
        public int? PreferencesCollected { get; set; }
        public int? TotalParticipants { get; set; }
        
        // Step 2: Analyzing Preferences
        public bool? PreferencesAnalyzed { get; set; }
        public int? CuisineTypesIdentified { get; set; }
        public double? AverageBudget { get; set; }
        
        // Step 3: Searching Venues
        public int? VenuesFound { get; set; }
        public int? VenuesFromTrackAsia { get; set; }
        public int? VenuesFromDatabase { get; set; }
        public double? SearchRadiusKm { get; set; }
        
        // Step 4: Evaluating Venues
        public int? VenuesEvaluated { get; set; }
        public int? VenuesScored { get; set; }
        public int? VenuesPassedThreshold { get; set; }
        
        // Step 5: AI Analysis
        public bool? GeminiAnalysisCompleted { get; set; }
        public int? VenuesAnalyzedByGemini { get; set; }
        public bool? GeminiTimeout { get; set; }
        
        // Step 6: Final Recommendations
        public int? FinalRecommendationsCount { get; set; }
        public DateTimeOffset? LastUpdated { get; set; }
    }
}

