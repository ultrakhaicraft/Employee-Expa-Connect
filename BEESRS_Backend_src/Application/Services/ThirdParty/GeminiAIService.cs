using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Application.Interfaces.ThirdParty;
using Application.Models;
using Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.Logging;

namespace Application.Services.ThirdParty
{
    public class GeminiAIService : IGeminiAIService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<GeminiAIService> _logger;
        private readonly string _apiKey;
        private readonly string _baseUrl;
        private readonly string _model;
        private readonly double _temperature;
        private readonly int _maxOutputTokens;
        private readonly int _topK;
        private readonly double _topP;

        public GeminiAIService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<GeminiAIService> logger)
        {
            _httpClient = httpClientFactory.CreateClient();
            _logger = logger;

            // Load configuration from appsettings.json
            _apiKey = configuration["Gemini:ApiKey"] ?? throw new ArgumentException("Gemini API Key not configured");
            _baseUrl = configuration["Gemini:BaseUrl"] ?? "https://generativelanguage.googleapis.com/v1beta";
            _model = configuration["Gemini:Model"] ?? "gemini-2.5-flash";

            // Validate and clamp temperature: must be in range [0.0, 2.0]
            var tempConfigValue = configuration["Gemini:Temperature"];
            var tempValue = double.TryParse(tempConfigValue, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var temp) ? temp : 0.7;
            if (tempValue < 0.0 || tempValue > 2.0)
            {
                _logger.LogWarning("Temperature value {TempValue} (from config: '{ConfigValue}') is out of range [0.0, 2.0], clamping to valid range", tempValue, tempConfigValue);
            }
            _temperature = Math.Max(0.0, Math.Min(2.0, tempValue));

            // gemini-2.5-flash supports up to 65,536 output tokens - use max from config or default to max
            _maxOutputTokens = int.TryParse(configuration["Gemini:MaxOutputTokens"], out var maxTokens) ? maxTokens : 65536;

            // Validate and clamp topK: must be positive integer
            var topKValue = int.TryParse(configuration["Gemini:TopK"], out var topK) ? topK : 40;
            if (topKValue < 1)
            {
                _logger.LogWarning("TopK value {TopKValue} is invalid, clamping to minimum 1", topKValue);
            }
            _topK = Math.Max(1, topKValue);

            // Validate and clamp topP: must be in range [0.0, 1.0]
            var topPConfigValue = configuration["Gemini:TopP"];
            var topPValue = double.TryParse(topPConfigValue, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var topP) ? topP : 0.95;
            if (topPValue < 0.0 || topPValue > 1.0)
            {
                _logger.LogWarning("TopP value {TopPValue} (from config: '{ConfigValue}') is out of range [0.0, 1.0], clamping to valid range", topPValue, topPConfigValue);
            }
            _topP = Math.Max(0.0, Math.Min(1.0, topPValue));

            // Log configuration for verification (mask API key)
            _logger.LogInformation("Gemini AI Service initialized - Model: {Model}, BaseUrl: {BaseUrl}, Temperature: {Temperature}, MaxOutputTokens: {MaxOutputTokens}, TopK: {TopK}, TopP: {TopP}",
                _model, _baseUrl, _temperature, _maxOutputTokens, _topK, _topP);
        }

        public async Task<GeminiRecommendationResult> AnalyzeVenuesAsync(
            List<Place> venues,
            AggregatedPreferences preferences,
            Event eventDetails,
            List<(double Latitude, double Longitude)> participantLocations)
        {
            try
            {
                var prompt = BuildAnalysisPrompt(venues, preferences, eventDetails, participantLocations);

                var request = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new[]
                            {
                                new { text = prompt }
                            }
                        }
                    },
                    generationConfig = new
                    {
                        temperature = _temperature,
                        topK = _topK,
                        topP = _topP,
                        // gemini-2.5-flash supports up to 65,536 output tokens - use maximum for comprehensive responses
                        maxOutputTokens = Math.Min(_maxOutputTokens, 65536), // Max output tokens for gemini-2.5-flash
                        responseMimeType = "application/json" // gemini-2.5-flash supports structured outputs
                    }
                };

                var json = JsonSerializer.Serialize(request);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var url = $"{_baseUrl}/models/{_model}:generateContent?key={_apiKey}";

                _logger.LogDebug("Sending request to Gemini API: Model={Model}, PromptLength={Length}", _model, prompt.Length);

                var response = await _httpClient.PostAsync(url, content);

                // Handle error response with detailed logging
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Gemini API error ({StatusCode}): {ErrorContent}. Model: {Model}",
                        response.StatusCode, errorContent, _model);

                    // Try without responseMimeType if 400 Bad Request (some models don't support it)
                    if (response.StatusCode == System.Net.HttpStatusCode.BadRequest)
                    {
                        _logger.LogWarning("Retrying without responseMimeType constraint for model {Model}", _model);
                        var requestWithoutMimeType = new
                        {
                            contents = new[]
                            {
                                new
                                {
                                    parts = new[]
                                    {
                                        new { text = prompt }
                                    }
                                }
                            },
                            generationConfig = new
                            {
                                temperature = _temperature,
                                topK = _topK,
                                topP = _topP,
                                maxOutputTokens = Math.Min(_maxOutputTokens, 65536) // Max output tokens for gemini-2.5-flash
                            }
                        };

                        var jsonRetry = JsonSerializer.Serialize(requestWithoutMimeType);
                        var contentRetry = new StringContent(jsonRetry, Encoding.UTF8, "application/json");
                        response = await _httpClient.PostAsync(url, contentRetry);

                        if (!response.IsSuccessStatusCode)
                        {
                            var retryErrorContent = await response.Content.ReadAsStringAsync();
                            _logger.LogError("Gemini API retry also failed ({StatusCode}): {ErrorContent}",
                                response.StatusCode, retryErrorContent);
                            throw new HttpRequestException($"Gemini API returned {response.StatusCode}: {retryErrorContent}");
                        }
                        else
                        {
                            _logger.LogInformation("Retry without responseMimeType succeeded");
                        }
                    }
                    else
                    {
                        throw new HttpRequestException($"Gemini API returned {response.StatusCode}: {errorContent}");
                    }
                }

                var responseContent = await response.Content.ReadAsStringAsync();
                var geminiResponse = JsonSerializer.Deserialize<GeminiResponse>(responseContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                var textResponse = geminiResponse?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;

                if (string.IsNullOrEmpty(textResponse))
                {
                    _logger.LogWarning("Empty response from Gemini AI");
                    return new GeminiRecommendationResult
                    {
                        VenueAnalyses = new List<GeminiVenueAnalysis>(),
                        OverallInsight = "Unable to generate AI insights at this time."
                    };
                }

                return ParseGeminiResponse(textResponse);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing venues with Gemini AI");
                return new GeminiRecommendationResult
                {
                    VenueAnalyses = new List<GeminiVenueAnalysis>(),
                    OverallInsight = "AI analysis temporarily unavailable."
                };
            }
        }

        public async Task<string> GenerateDetailedReasoningAsync(
            Place venue,
            AggregatedPreferences preferences,
            Event eventDetails,
            double score)
        {
            try
            {
                var prompt = $@"Generate a detailed, human-friendly explanation for why this venue is recommended for a team event.

**Venue Information:**
                - Name: {venue.Name}
                - Category: {venue.PlaceCategory?.Name ?? "N/A"}
                - Rating: {venue.AverageRating}/5 ({venue.TotalReviews} reviews)
                - Price Level: {venue.PriceLevel} USD/person
                - Capacity: {venue.SuitableFor} people

**Event Details:**
                - Type: {eventDetails.EventType}
                - Expected Attendees: {eventDetails.ExpectedAttendees}
                - Budget: {eventDetails.BudgetPerPerson} USD/person

**Team Preferences:**
                - Popular Cuisines: {string.Join(", ", preferences.CuisineTypes.Take(3))}
                - Average Budget: {preferences.AverageBudget} USD
                - Dietary Restrictions: {string.Join(", ", preferences.DietaryRestrictions)}

**AI Score:** {score:F1}/100

Please provide:
1. A friendly, conversational explanation (2-3 sentences)
2. Why this venue matches the team's preferences
3. Any special considerations

Keep it concise and positive!";

                var request = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new[]
                            {
                                new { text = prompt }
                            }
                        }
                    },
                    generationConfig = new
                    {
                        temperature = _temperature,
                        maxOutputTokens = Math.Min(_maxOutputTokens, 65536) // Use max for detailed reasoning
                    }
                };

                var json = JsonSerializer.Serialize(request);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var url = $"{_baseUrl}/models/{_model}:generateContent?key={_apiKey}";
                var response = await _httpClient.PostAsync(url, content);
                response.EnsureSuccessStatusCode();

                var responseContent = await response.Content.ReadAsStringAsync();
                var geminiResponse = JsonSerializer.Deserialize<GeminiResponse>(responseContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return geminiResponse?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text
                    ?? $"This venue scores {score:F1}/100 based on team preferences and event requirements.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating detailed reasoning");
                return $"Recommended with a score of {score:F1}/100 based on your team's preferences.";
            }
        }

        private string BuildAnalysisPrompt(
            List<Place> venues,
            AggregatedPreferences preferences,
            Event eventDetails,
            List<(double Latitude, double Longitude)> participantLocations)
        {
            // Xây dựng thông tin đầy đủ về venues, bao gồm category và tags
            var venuesInfo = string.Join("\n", venues.Select((v, i) =>
            {
                var categoryName = v.PlaceCategory?.Name ?? "N/A";
                var tags = v.PlaceTagAssignments?
                    .Where(pta => pta.PlaceTag != null)
                    .Select(pta => pta.PlaceTag.Name)
                    .ToList() ?? new List<string>();
                var tagsStr = tags.Any() ? string.Join(", ", tags) : "N/A";

                return $"{i + 1}. {v.Name} - Category: {categoryName}, Tags: {tagsStr}, Rating: {v.AverageRating}/5, Price: {v.PriceLevel} USD, Capacity: {v.SuitableFor ?? "N/A"}, PlaceId: {v.PlaceId}";
            }));

            // Xây dựng thông tin đầy đủ về event để Gemini có thể phân tích loại địa điểm
            var eventTimeStr = eventDetails.ScheduledTime.ToString(@"hh\:mm");
            var durationStr = eventDetails.EstimatedDuration.HasValue
                ? $"{eventDetails.EstimatedDuration} minutes"
                : "N/A";

            return $@"You are an AI event planner helping a team choose the best venue for their event.

**Event Details (Đầy đủ thông tin để xác định loại địa điểm phù hợp - quán ăn hay quán uống):**
- Title: {eventDetails.Title}
- Description: {eventDetails.Description ?? "N/A"}
- Type: {eventDetails.EventType}
- Date: {eventDetails.ScheduledDate:yyyy-MM-dd}
- Time: {eventTimeStr}
- Expected Attendees: {eventDetails.ExpectedAttendees}
- Estimated Duration: {durationStr}
- Budget: {eventDetails.BudgetPerPerson} USD/person

**Team Preferences (aggregated from {preferences.ParticipantIds.Count} members):**
- Popular Cuisines: {string.Join(", ", preferences.CuisineTypes)}
- Average Budget: {preferences.AverageBudget} USD
- Max Distance: {preferences.MaxDistanceRadius} km
- Dietary Restrictions: {string.Join(", ", preferences.DietaryRestrictions)}

**Candidate Venues:**
{venuesInfo}

**CRITICAL REQUIREMENTS - BẮT BUỘC PHẢI TRẢ VỀ:**

1. Based on the event details (Title, Description, EventType, Time, Duration), you MUST determine if this is:
   - A dining event (quán ăn/nhà hàng) → suggest ""restaurant"" category
   - A drinking/social event (quán uống/cà phê/bar) → suggest ""cafe"" or ""bar"" category
   - A casual meetup → suggest ""cafe"" category

2. For EACH venue in venueAnalyses, you MUST provide:
   - ""suggestedCategory"": The exact category name that matches PlaceCategory.Name in the database (e.g., ""restaurant"", ""cafe"", ""bar"", ""bakery"", ""fast_food"", etc.). This is REQUIRED and cannot be null or empty.
   - ""suggestedPlaceTags"": A list of tag names that match PlaceTag.Name in the database (e.g., [""cozy"", ""outdoor seating"", ""vegetarian-friendly"", ""pet-friendly"", ""wifi"", ""parking""]). Can be empty array if no tags match.

3. At the overall level, you MUST provide:
   - ""suggestedEventCategory"": The best category for this event type based on analysis. This will be used to search for similar places in the database. REQUIRED.
   - ""suggestedEventTags"": Recommended tags for finding similar places. Can be empty array.

Please analyze each venue and provide a JSON response with this EXACT structure (all fields are required):
{{
  ""venueAnalyses"": [
    {{
      ""placeId"": ""guid"",
      ""venueName"": ""name"",
      ""adjustedScore"": 85.5,
      ""detailedReasoning"": ""2-3 sentences explaining why this venue is good/bad"",
      ""pros"": [""pro1"", ""pro2"", ""pro3""],
      ""cons"": [""con1"", ""con2""],
      ""teamFitAnalysis"": ""How well this venue fits the team dynamics"",
      ""specialConsiderations"": [""consideration1"", ""consideration2""],
      ""suggestedCategory"": ""restaurant"",
      ""suggestedPlaceTags"": [""tag1"", ""tag2""]
    }}
  ],
  ""overallInsight"": ""General insight about the venue options for this event"",
  ""suggestedEventCategory"": ""restaurant"",
  ""suggestedEventTags"": [""tag1"", ""tag2"", ""tag3""]
}}

**IMPORTANT NOTES:**
- The suggestedCategory and suggestedEventCategory MUST match existing PlaceCategory.Name values in the database
- Common categories: ""restaurant"", ""cafe"", ""bar"", ""bakery"", ""fast_food"", ""bistro"", ""pub""
- If you cannot determine the exact category, use ""restaurant"" as default for dining events or ""cafe"" for casual/drinking events
- The suggestedPlaceTags and suggestedEventTags should match existing PlaceTag.Name values if possible
- These category and tags will be used to search for similar places in the database, so accuracy is critical

Focus on:
1. Event type analysis (dining vs drinking vs casual meetup)
2. Team preference alignment
3. Budget appropriateness
4. Venue atmosphere for team bonding
5. Practical considerations (capacity, location, dietary needs)

Be friendly and conversational in your reasoning!";
        }

        private GeminiRecommendationResult ParseGeminiResponse(string jsonResponse)
        {
            try
            {
                // Remove markdown code blocks if present (```json ... ```)
                var cleanedResponse = jsonResponse.Trim();
                if (cleanedResponse.StartsWith("```"))
                {
                    var firstNewLine = cleanedResponse.IndexOf('\n');
                    var lastBacktick = cleanedResponse.LastIndexOf("```");
                    if (firstNewLine > 0 && lastBacktick > firstNewLine)
                    {
                        cleanedResponse = cleanedResponse.Substring(firstNewLine + 1, lastBacktick - firstNewLine - 1).Trim();
                    }
                }

                var result = JsonSerializer.Deserialize<GeminiRecommendationResult>(cleanedResponse, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                // Validate that we got the required fields
                if (result != null)
                {
                    // Ensure lists are initialized
                    if (result.VenueAnalyses == null)
                        result.VenueAnalyses = new List<GeminiVenueAnalysis>();

                    if (result.SuggestedEventTags == null)
                        result.SuggestedEventTags = new List<string>();

                    // Ensure each venue analysis has required fields
                    foreach (var analysis in result.VenueAnalyses)
                    {
                        if (analysis.SuggestedPlaceTags == null)
                            analysis.SuggestedPlaceTags = new List<string>();

                        // Set default category if missing
                        if (string.IsNullOrEmpty(analysis.SuggestedCategory))
                        {
                            analysis.SuggestedCategory = "restaurant";
                            _logger.LogWarning("Missing suggestedCategory for venue {VenueName}, defaulting to 'restaurant'", analysis.VenueName);
                        }
                    }

                    // Set default event category if missing
                    if (string.IsNullOrEmpty(result.SuggestedEventCategory))
                    {
                        result.SuggestedEventCategory = "restaurant";
                        _logger.LogWarning("Missing suggestedEventCategory, defaulting to 'restaurant'");
                    }
                }

                return result ?? new GeminiRecommendationResult
                {
                    VenueAnalyses = new List<GeminiVenueAnalysis>(),
                    OverallInsight = "Analysis completed successfully.",
                    SuggestedEventCategory = "restaurant",
                    SuggestedEventTags = new List<string>()
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing Gemini response: {Response}", jsonResponse?.Substring(0, Math.Min(500, jsonResponse?.Length ?? 0)));
                return new GeminiRecommendationResult
                {
                    VenueAnalyses = new List<GeminiVenueAnalysis>(),
                    OverallInsight = "Response parsing failed.",
                    SuggestedEventCategory = "restaurant",
                    SuggestedEventTags = new List<string>()
                };
            }
        }

        #region Gemini Response Models

        private class GeminiResponse
        {
            public List<GeminiCandidate> Candidates { get; set; }
        }

        private class GeminiCandidate
        {
            public GeminiContent Content { get; set; }
        }

        private class GeminiContent
        {
            public List<GeminiPart> Parts { get; set; }
        }

        private class GeminiPart
        {
            public string Text { get; set; }
        }

        #endregion
    }
}