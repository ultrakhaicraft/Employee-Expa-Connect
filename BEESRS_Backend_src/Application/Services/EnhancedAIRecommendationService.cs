using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using System.Text;
using Application.Exceptions;
using Application.Interfaces;
using Application.Models;
using Domain.Entities;
using Infrastructure.Interfaces;
using Infrastructure.Interfaces.IPlaceRepos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NetTopologySuite.Geometries;
using Application.Interfaces.ThirdParty;

namespace Application.Services
{
    /// <summary>
    /// Wrapper class to hold internal Place data
    /// </summary>
    internal class PlaceRecommendation
    {
        public Place InternalPlace { get; set; }
    }

    /// <summary>
    /// Scored recommendation for system places
    /// </summary>
    internal class ScoredRecommendation
    {
        public PlaceRecommendation Recommendation { get; set; }
        public double Score { get; set; }
        public string Reasoning { get; set; }
        public List<string> Pros { get; set; }
        public List<string> Cons { get; set; }
    }

    /// <summary>
    /// Enhanced AI Recommendation Service using system places and Gemini AI
    /// </summary>
    public class EnhancedAIRecommendationService : IAIRecommendationService
    {
        private readonly IEventRepository _eventRepository;
        private readonly IEventParticipantRepository _participantRepository;
        private readonly IEventPlaceOptionRepository _optionRepository;
        private readonly IPlaceRepository _placeRepository;
        private readonly IUserLocationRepository _locationRepository;
        private readonly IVenueScoringService _scoringService;
        private readonly IGeminiAIService _geminiAIService;
        private readonly IUserRepository _userRepository;
        private readonly ILogger<EnhancedAIRecommendationService> _logger;

        public EnhancedAIRecommendationService(
            IEventRepository eventRepository,
            IEventParticipantRepository participantRepository,
            IEventPlaceOptionRepository optionRepository,
            IPlaceRepository placeRepository,
            IUserLocationRepository locationRepository,
            IVenueScoringService scoringService,
            IGeminiAIService geminiAIService,
            IUserRepository userRepository,
            ILogger<EnhancedAIRecommendationService> logger)
        {
            _eventRepository = eventRepository;
            _participantRepository = participantRepository;
            _optionRepository = optionRepository;
            _placeRepository = placeRepository;
            _locationRepository = locationRepository;
            _scoringService = scoringService;
            _geminiAIService = geminiAIService;
            _userRepository = userRepository;
            _logger = logger;
        }

        public async Task<List<EventPlaceOption>> GenerateRecommendationsAsync(
            Guid eventId, 
            AggregatedPreferences preferences,
            double? searchLatitude = null,
            double? searchLongitude = null,
            double? searchRadiusKm = null)
        {
            var eventEntity = await _eventRepository.GetByIdWithDetailsAsync(eventId);

            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            var progress = new AiAnalysisProgress
            {
                CurrentStep = 1,
                CurrentStepName = "Collecting team preferences",
                ProgressPercentage = 0,
                LastUpdated = DateTimeOffset.Now
            };

            // Step 1: Get participant locations
            var participantLocations = await GetParticipantLocationsAsync(eventId);
            var totalParticipants = eventEntity.EventParticipants?.Count(ep => ep.InvitationStatus == "accepted") ?? 0;
            progress.PreferencesCollected = totalParticipants;
            progress.TotalParticipants = totalParticipants;
            progress.CurrentStep = 2;
            progress.CurrentStepName = "Analyzing preferences and requirements";
            progress.ProgressPercentage = 20;
            await UpdateProgressAsync(eventId, progress);

            // Step 2: Determine search location (use provided location or calculate centroid)
            (double Latitude, double Longitude) searchLocation;
            if (searchLatitude.HasValue && searchLongitude.HasValue)
            {
                // Use user-selected location
                searchLocation = (searchLatitude.Value, searchLongitude.Value);
                _logger.LogInformation("Using user-selected location for search: Lat={Lat}, Lng={Lng}", 
                    searchLatitude.Value, searchLongitude.Value);
            }
            else
            {
                // Calculate centroid from participant locations (default behavior)
                var centroidLocation = CalculateCentroid(participantLocations);
                searchLocation = centroidLocation;
                _logger.LogInformation("Using calculated centroid from participant locations: Lat={Lat}, Lng={Lng}", 
                    centroidLocation.Latitude, centroidLocation.Longitude);
            }
            
            progress.PreferencesAnalyzed = true;
            progress.CuisineTypesIdentified = preferences.CuisineTypes?.Count ?? 0;
            progress.AverageBudget = (double)preferences.AverageBudget;
            progress.CurrentStep = 3;
            progress.CurrentStepName = "Searching for suitable venues";
            progress.ProgressPercentage = 40;
            await UpdateProgressAsync(eventId, progress);

            // Step 3: Get system places from database
            // Use provided radius or fallback to user preference
            var searchRadiusMeters = searchRadiusKm.HasValue 
                ? (int)(searchRadiusKm.Value * 1000) 
                : (int)(preferences.MaxDistanceRadius * 1000);
            
            var searchRadiusKmValue = searchRadiusKm ?? preferences.MaxDistanceRadius;
            _logger.LogInformation(
                "Searching for system venues: Location=({Lat}, {Lng}), Radius={Radius}km ({RadiusMeters}m), CuisineTypes={CuisineTypes}", 
                searchLocation.Latitude, 
                searchLocation.Longitude, 
                searchRadiusKmValue, 
                searchRadiusMeters,
                string.Join(", ", preferences.CuisineTypes ?? new List<string>()));
            
            // Get system places - first with location filter, then without if no results
            var systemPlaces = await GetDatabaseVenuesAsync(
                preferences, 
                null, 
                searchLocation, 
                searchRadiusMeters);
            
            _logger.LogInformation("Found {Count} system places matching preferences (with location filter)", systemPlaces.Count);
            
            // If no places found with location filter, try without location filter (but still match preferences)
            if (!systemPlaces.Any())
            {
                _logger.LogWarning("No system places found with location filter, trying without location filter");
                systemPlaces = await GetDatabaseVenuesAsync(
                    preferences, 
                    null, 
                    null, // No location filter
                    null);
                _logger.LogInformation("Found {Count} system places matching preferences (without location filter)", systemPlaces.Count);
            }
            
            // Convert to PlaceRecommendation list
            var enrichedRecommendations = systemPlaces.Select(p => new PlaceRecommendation
            {
                InternalPlace = p
            }).ToList();
            
            progress.VenuesFromDatabase = enrichedRecommendations.Count;
            progress.VenuesFromTrackAsia = 0; // No TrackAsia places
            progress.SearchRadiusKm = searchRadiusKmValue;
            progress.VenuesFound = enrichedRecommendations.Count;
            progress.CurrentStep = 4;
            progress.CurrentStepName = "Evaluating and scoring venues";
            progress.ProgressPercentage = 60;
            await UpdateProgressAsync(eventId, progress);

            // Step 5: Score all system places
            var scoredRecommendations = new List<ScoredRecommendation>();
            
            _logger.LogInformation("Scoring {Count} system places", enrichedRecommendations.Count);
            
            foreach (var recommendation in enrichedRecommendations)
            {
                var venue = recommendation.InternalPlace;
                // Ensure venue has full details loaded for comprehensive pros/cons generation
                if (venue.PlaceTagAssignments == null || !venue.PlaceTagAssignments.Any() || 
                    venue.PlaceReviews == null || !venue.PlaceReviews.Any())
                {
                    venue = await _placeRepository.GetAllPlace()
                        .Include(p => p.PlaceCategory)
                        .Include(p => p.PlaceTagAssignments)
                            .ThenInclude(pta => pta.PlaceTag)
                        .Include(p => p.PlaceReviews)
                        .FirstOrDefaultAsync(p => p.PlaceId == venue.PlaceId) ?? venue;
                }

                var score = _scoringService.CalculateScore(venue, preferences, eventEntity, participantLocations);
                _logger.LogInformation("Scored system place: {Name} (PlaceId: {PlaceId}) - Score: {Score}", 
                    venue.Name, venue.PlaceId, score);
                
                scoredRecommendations.Add(new ScoredRecommendation
                {
                    Recommendation = recommendation,
                    Score = score,
                    Reasoning = _scoringService.GenerateReasoning(venue, preferences, eventEntity),
                    Pros = _scoringService.GeneratePros(venue, preferences, eventEntity),
                    Cons = _scoringService.GenerateCons(venue, preferences, eventEntity)
                });
            }
            
            var systemPlaceScores = scoredRecommendations
                .Select(sr => $"{sr.Recommendation.InternalPlace?.Name}: {sr.Score:F1}")
                .ToList();
            _logger.LogInformation("Scored {Count} system places. Scores: {Scores}", 
                scoredRecommendations.Count,
                string.Join(", ", systemPlaceScores));

            // Filter and select top recommendations (score > 40, then take top 5)
            var topScoredRecommendations = scoredRecommendations
                .Where(sr => sr.Score > 40)
                .OrderByDescending(sr => sr.Score)
                .Take(5)
                .ToList();
            
            // If we don't have enough places with score > 40, take top 5 regardless of score
            if (topScoredRecommendations.Count < 5 && scoredRecommendations.Count > topScoredRecommendations.Count)
            {
                var additionalPlaces = scoredRecommendations
                    .OrderByDescending(sr => sr.Score)
                    .Skip(topScoredRecommendations.Count)
                    .Take(5 - topScoredRecommendations.Count)
                    .ToList();
                topScoredRecommendations.AddRange(additionalPlaces);
                _logger.LogInformation("Added {Count} additional system places with lower scores to meet minimum requirement", 
                    additionalPlaces.Count);
            }
            
            _logger.LogInformation(
                "Selected {Count} system places for recommendations (scores: {Scores})",
                topScoredRecommendations.Count,
                string.Join(", ", topScoredRecommendations.Select(sr => $"{sr.Score:F1}")));

            progress.VenuesEvaluated = enrichedRecommendations.Count;
            progress.VenuesScored = topScoredRecommendations.Count;
            progress.VenuesPassedThreshold = topScoredRecommendations.Count;
            await UpdateProgressAsync(eventId, progress);

            // Step 7: Enhance with Gemini AI analysis (with timeout fallback)
            GeminiRecommendationResult geminiAnalysis = null;
            progress.CurrentStep = 5;
            progress.CurrentStepName = "Building recommendation list";
            progress.ProgressPercentage = 80;
            
            // Send system places to Gemini
            var placesForGemini = topScoredRecommendations
                .Select(sr => sr.Recommendation.InternalPlace)
                .Take(5)
                .ToList();
            
            progress.VenuesAnalyzedByGemini = placesForGemini.Count;
            await UpdateProgressAsync(eventId, progress);

            try
            {
                // Use timeout to prevent long waits
                // Send system places to Gemini for analysis
                var geminiTask = _geminiAIService.AnalyzeVenuesAsync(
                    placesForGemini,
                    preferences,
                    eventEntity,
                    participantLocations);
                
                // Wait max 30 seconds for Gemini AI
                var timeoutTask = Task.Delay(TimeSpan.FromSeconds(30));
                var completedTask = await Task.WhenAny(geminiTask, timeoutTask);
                
                if (completedTask == geminiTask)
                {
                    geminiAnalysis = await geminiTask;
                    progress.GeminiAnalysisCompleted = true;
                    progress.GeminiTimeout = false;
                }
                else
                {
                    _logger.LogWarning("Gemini AI analysis timed out after 30 seconds, using traditional scoring only");
                    progress.GeminiAnalysisCompleted = false;
                    progress.GeminiTimeout = true;
                    // Continue without Gemini analysis
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Gemini AI analysis, continuing with traditional scoring");
                progress.GeminiAnalysisCompleted = false;
                progress.GeminiTimeout = false;
                // Continue without Gemini analysis
            }
            
            await UpdateProgressAsync(eventId, progress);

            // Step 7.5: Retry logic if needed (skip for now as we have external recommendations)
            if (!topScoredRecommendations.Any())
            {
                throw new InvalidOperationException("No suitable venues found for this event");
            }

            // Step 8: Create final recommendations
            var finalRecommendations = topScoredRecommendations;

            // Step 9: Create event place options (all from system)
            var recommendations = new List<EventPlaceOption>();
            foreach (var scoredRec in finalRecommendations)
            {
                var rec = scoredRec.Recommendation;
                var option = new EventPlaceOption
                {
                    EventId = eventId,
                    PlaceId = rec.InternalPlace.PlaceId,
                    SuggestedBy = "AI",
                    AiScore = (decimal)scoredRec.Score,
                    AiReasoning = scoredRec.Reasoning,
                    Pros = JsonSerializer.Serialize(scoredRec.Pros),
                    Cons = JsonSerializer.Serialize(scoredRec.Cons),
                    EstimatedCostPerPerson = rec.InternalPlace.PriceLevel,
                    AddedAt = DateTimeOffset.Now
                };

                recommendations.Add(option);
                await _optionRepository.CreateAsync(option);
            }

            progress.FinalRecommendationsCount = recommendations.Count;
            progress.ProgressPercentage = 100;
            progress.CurrentStep = 6;
            progress.CurrentStepName = "Completed";
            await UpdateProgressAsync(eventId, progress);

            return recommendations;
        }

        private async Task UpdateProgressAsync(Guid eventId, AiAnalysisProgress progress)
        {
            try
            {
                var eventEntity = await _eventRepository.GetByIdAsync(eventId);
                if (eventEntity != null)
                {
                    progress.LastUpdated = DateTimeOffset.Now;
                    eventEntity.AiAnalysisProgress = JsonSerializer.Serialize(progress);
                    await _eventRepository.UpdateAsync(eventEntity);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to update AI analysis progress");
                // Don't throw, just log - progress update is not critical
            }
        }

        private async Task<List<(double Latitude, double Longitude)>> GetParticipantLocationsAsync(Guid eventId)
        {
            var participantIds = await _participantRepository.GetAcceptedParticipantIdsAsync(eventId);
            var locations = await _locationRepository.GetByUserIdsAsync(participantIds);
            return locations.Select(l => ((double)l.Latitude, (double)l.Longitude)).ToList();
        }

        private (double Latitude, double Longitude) CalculateCentroid(List<(double Latitude, double Longitude)> locations)
        {
            if (!locations.Any())
                return (10.762622, 106.660172); // Default: Ho Chi Minh City center

            var avgLat = locations.Average(l => l.Latitude);
            var avgLng = locations.Average(l => l.Longitude);
            return (avgLat, avgLng);
        }


        private int? DetermineCategoryId(List<string> types)
        {
            if (types == null || !types.Any()) 
                return 1; // Default to Restaurant
            
            var typesLower = types.Select(t => t.ToLowerInvariant()).ToList();
            
            if (typesLower.Contains("restaurant") || typesLower.Contains("food") || typesLower.Contains("meal_takeaway"))
                return 1; // Restaurant
            if (typesLower.Contains("cafe") || typesLower.Contains("coffee_shop") || typesLower.Contains("bakery"))
                return 2; // Cafe
            if (typesLower.Contains("bar") || typesLower.Contains("night_club"))
                return 3; // Bar (if exists)
            
            return 1; // Default to Restaurant
        }

        private async Task<List<Place>> GetDatabaseVenuesAsync(
            AggregatedPreferences preferences, 
            GeminiRecommendationResult geminiAnalysis = null,
            (double Latitude, double Longitude)? searchLocation = null,
            int? searchRadiusMeters = null)
        {
            var baseQuery = _placeRepository.GetAllPlace()
                .Include(p => p.PlaceTagAssignments)
                    .ThenInclude(pta => pta.PlaceTag)
                .Include(p => p.PlaceCategory)
                .Where(p => p.IsDeleted == false && p.VerificationStatus == Domain.Enums.PlaceVerificationStatus.Approved);
            
            // Filter by location if provided (to only get places within search radius)
            if (searchLocation.HasValue && searchRadiusMeters.HasValue && searchRadiusMeters.Value > 0)
            {
                var searchPoint = new NetTopologySuite.Geometries.Point(
                    searchLocation.Value.Longitude, 
                    searchLocation.Value.Latitude) { SRID = 4326 };
                
                baseQuery = baseQuery.Where(p => 
                    p.GeoLocation != null && 
                    p.GeoLocation.Distance(searchPoint) <= searchRadiusMeters.Value);
                
                _logger.LogInformation("Filtering system places by location: radius {Radius}m from ({Lat}, {Lng})", 
                    searchRadiusMeters.Value, searchLocation.Value.Latitude, searchLocation.Value.Longitude);
            }

            // PRIORITY 1: Match places by user preferences (CuisineTypes) via PlaceTagAssignment
            // This is the main logic: find places that have tags matching user preferences
            if (preferences.CuisineTypes != null && preferences.CuisineTypes.Any())
            {
                var preferenceTags = preferences.CuisineTypes.Select(c => c.Trim()).ToList();
                _logger.LogInformation("Searching for system places with tags matching: {Tags}", string.Join(", ", preferenceTags));
                
                // First, check how many places exist in total (for debugging)
                var totalPlacesCount = await baseQuery.CountAsync();
                _logger.LogInformation("Total approved places in system: {Count}", totalPlacesCount);
                
                // Find places that have tags matching user preferences
                // Convert to lowercase for case-insensitive comparison (EF Core compatible)
                var preferenceTagsLower = preferenceTags.Select(pt => pt.ToLower()).ToList();
                var tagMatchedQuery = baseQuery.Where(p => 
                    p.PlaceTagAssignments.Any(pta => 
                        pta.PlaceTag != null && 
                        pta.PlaceTag.IsActive &&
                        preferenceTagsLower.Contains(pta.PlaceTag.Name.ToLower())));
                
                var tagMatchedCount = await tagMatchedQuery.CountAsync();
                _logger.LogInformation("Found {Count} places with matching tags (before ordering)", tagMatchedCount);
                
                var tagMatchedPlaces = await tagMatchedQuery
                    .OrderByDescending(p => p.AverageRating)
                    .ThenByDescending(p => p.TotalReviews)
                    .Take(20)
                    .ToListAsync();
                
                if (tagMatchedPlaces.Any())
                {
                    _logger.LogInformation(
                        "Found {Count} system places matching user preferences via PlaceTagAssignment: {Preferences}. Sample places: {SamplePlaces}", 
                        tagMatchedPlaces.Count, 
                        string.Join(", ", preferenceTags),
                        string.Join(", ", tagMatchedPlaces.Take(3).Select(p => $"{p.Name} (Rating: {p.AverageRating})")));
                    return tagMatchedPlaces;
                }
                
                _logger.LogWarning(
                    "No places found with tags matching preferences '{Preferences}'. Total places in system: {TotalCount}. Trying category match...", 
                    string.Join(", ", preferenceTags),
                    totalPlacesCount);
            }

            // PRIORITY 2: Match places by category (if no tag match found)
            if (preferences.CuisineTypes != null && preferences.CuisineTypes.Any())
            {
                var categoryMatchedQuery = baseQuery.Where(p => 
                    p.PlaceCategory != null && 
                    preferences.CuisineTypes.Contains(p.PlaceCategory.Name));
                
                var categoryMatchedPlaces = await categoryMatchedQuery
                    .OrderByDescending(p => p.AverageRating)
                    .ThenByDescending(p => p.TotalReviews)
                    .Take(20)
                    .ToListAsync();
                
                if (categoryMatchedPlaces.Any())
                {
                    _logger.LogInformation(
                        "Found {Count} system places matching user preferences via category: {Categories}", 
                        categoryMatchedPlaces.Count, 
                        string.Join(", ", preferences.CuisineTypes));
                    return categoryMatchedPlaces;
                }
            }

            // PRIORITY 3: Use Gemini analysis if available (fallback)
            if (geminiAnalysis != null)
            {
                var hasCategory = !string.IsNullOrEmpty(geminiAnalysis.SuggestedEventCategory);
                var hasTags = geminiAnalysis.SuggestedEventTags != null && geminiAnalysis.SuggestedEventTags.Any();
                
                if (hasCategory || hasTags)
                {
                    // Strategy 1: Try with category first (if available)
                    if (hasCategory)
                    {
                        var categoryQuery = baseQuery.Where(p => p.PlaceCategory != null && 
                            p.PlaceCategory.Name.ToLower() == geminiAnalysis.SuggestedEventCategory.ToLower());
                        
                        var categoryResults = await categoryQuery
                            .OrderByDescending(p => p.AverageRating)
                            .Take(20)
                            .ToListAsync();
                        
                        if (categoryResults.Any())
                        {
                            _logger.LogInformation("Found {Count} places using Gemini-suggested category: {Category}", 
                                categoryResults.Count, geminiAnalysis.SuggestedEventCategory);
                            return categoryResults;
                        }
                        
                        _logger.LogInformation("No places found with category '{Category}', trying with tags", 
                            geminiAnalysis.SuggestedEventCategory);
                    }
                    
                    // Strategy 2: If no category or not found, try with tags
                    if (hasTags)
                    {
                        var tagNames = geminiAnalysis.SuggestedEventTags;
                        var tagQuery = baseQuery.Where(p => p.PlaceTagAssignments.Any(pta => 
                            pta.PlaceTag != null && tagNames.Contains(pta.PlaceTag.Name)));
                        
                        var tagResults = await tagQuery
                            .OrderByDescending(p => p.AverageRating)
                            .Take(20)
                            .ToListAsync();
                        
                        if (tagResults.Any())
                        {
                            _logger.LogInformation("Found {Count} places using Gemini-suggested tags: {Tags}", 
                                tagResults.Count, string.Join(", ", tagNames));
                            return tagResults;
                        }
                        
                        _logger.LogInformation("No places found with tags '{Tags}', trying category OR tags", 
                            string.Join(", ", tagNames));
                    }
                    
                    // Strategy 3: If still not found, try category OR tags
                    if (hasCategory && hasTags)
                    {
                        var tagNames = geminiAnalysis.SuggestedEventTags;
                        var orQuery = baseQuery.Where(p => 
                            (p.PlaceCategory != null && 
                             p.PlaceCategory.Name.ToLower() == geminiAnalysis.SuggestedEventCategory.ToLower()) ||
                            p.PlaceTagAssignments.Any(pta => 
                                pta.PlaceTag != null && tagNames.Contains(pta.PlaceTag.Name)));
                        
                        var orResults = await orQuery
                            .OrderByDescending(p => p.AverageRating)
                            .Take(20)
                            .ToListAsync();
                        
                        if (orResults.Any())
                        {
                            _logger.LogInformation("Found {Count} places using category OR tags", orResults.Count);
                            return orResults;
                        }
                    }
                    
                    _logger.LogWarning("No places found with Gemini suggestions (category: {Category}, tags: {Tags}), falling back to cuisine types", 
                        geminiAnalysis.SuggestedEventCategory ?? "none", 
                        geminiAnalysis.SuggestedEventTags != null ? string.Join(", ", geminiAnalysis.SuggestedEventTags) : "none");
                }
            }
            
            // Fallback: use cuisine types from preferences
            if (preferences.CuisineTypes.Any())
            {
                var cuisineQuery = baseQuery.Where(p => p.PlaceCategory != null && 
                    preferences.CuisineTypes.Contains(p.PlaceCategory.Name));
                
                var cuisineResults = await cuisineQuery
                    .OrderByDescending(p => p.AverageRating)
                    .Take(20)
                    .ToListAsync();
                
                if (cuisineResults.Any())
                {
                    _logger.LogInformation("Found {Count} places using cuisine types: {Cuisines}", 
                        cuisineResults.Count, string.Join(", ", preferences.CuisineTypes));
                    return cuisineResults;
                }
            }
            
            // Final fallback: get any verified places
            _logger.LogWarning("No places found with any filters, returning top rated verified places");
            return await baseQuery
                .OrderByDescending(p => p.AverageRating)
                .Take(20)
                .ToListAsync();
        }


        private List<RecommendationResult> MergeAnalysisResults(
            List<ScoredVenue> scoredVenues,
            GeminiRecommendationResult geminiAnalysis)
        {
            var results = new List<RecommendationResult>();

            foreach (var scored in scoredVenues)
            {
                // Handle null geminiAnalysis (timeout or error)
                var geminiVenue = geminiAnalysis?.VenueAnalyses
                    ?.FirstOrDefault(ga => ga.PlaceId == scored.Venue.PlaceId);

                results.Add(new RecommendationResult
                {
                    PlaceId = scored.Venue.PlaceId,
                    Score = geminiVenue?.AdjustedScore ?? scored.Score,
                    DetailedReasoning = geminiVenue?.DetailedReasoning ?? scored.Reasoning,
                    Pros = geminiVenue?.Pros ?? scored.Pros,
                    Cons = geminiVenue?.Cons ?? scored.Cons,
                    EstimatedCost = scored.Venue.PriceLevel
                });
            }

            return results.OrderByDescending(r => r.Score).ToList();
        }

        private class ScoredVenue
        {
            public Place Venue { get; set; }
            public double Score { get; set; }
            public string Reasoning { get; set; }
            public List<string> Pros { get; set; }
            public List<string> Cons { get; set; }
        }

        private class RecommendationResult
        {
            public Guid PlaceId { get; set; }
            public double Score { get; set; }
            public string DetailedReasoning { get; set; }
            public List<string> Pros { get; set; }
            public List<string> Cons { get; set; }
            public decimal? EstimatedCost { get; set; }
        }

        /// <summary>
        /// Normalize string for comparison (lowercase, trim, remove extra spaces)
        /// </summary>
        private string NormalizeString(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;
            
            return input.Trim().ToLowerInvariant()
                .Replace("  ", " ") // Remove double spaces
                .Replace("  ", " "); // Remove any remaining double spaces
        }

        /// <summary>
        /// Calculate similarity between two strings using Levenshtein distance
        /// Returns a value between 0.0 (completely different) and 1.0 (identical)
        /// </summary>
        private double CalculateSimilarity(string s1, string s2)
        {
            if (string.IsNullOrEmpty(s1) && string.IsNullOrEmpty(s2))
                return 1.0;
            
            if (string.IsNullOrEmpty(s1) || string.IsNullOrEmpty(s2))
                return 0.0;

            if (s1 == s2)
                return 1.0;

            int maxLength = Math.Max(s1.Length, s2.Length);
            if (maxLength == 0)
                return 1.0;

            int distance = LevenshteinDistance(s1, s2);
            return 1.0 - (double)distance / maxLength;
        }

        /// <summary>
        /// Calculate Levenshtein distance between two strings
        /// </summary>
        private int LevenshteinDistance(string s, string t)
        {
            if (string.IsNullOrEmpty(s))
                return string.IsNullOrEmpty(t) ? 0 : t.Length;
            
            if (string.IsNullOrEmpty(t))
                return s.Length;

            int n = s.Length;
            int m = t.Length;
            int[,] d = new int[n + 1, m + 1];

            // Initialize
            for (int i = 0; i <= n; d[i, 0] = i++) { }
            for (int j = 0; j <= m; d[0, j] = j++) { }

            // Fill matrix
            for (int i = 1; i <= n; i++)
            {
                for (int j = 1; j <= m; j++)
                {
                    int cost = (t[j - 1] == s[i - 1]) ? 0 : 1;
                    d[i, j] = Math.Min(
                        Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                        d[i - 1, j - 1] + cost);
                }
            }

            return d[n, m];
        }
    }
}

