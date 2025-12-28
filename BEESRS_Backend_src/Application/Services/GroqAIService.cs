using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Models.Chat;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Application.Services
{
    public class GroqAIService : IAIService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<GroqAIService> _logger;
        private readonly ICacheService _cacheService;
        private readonly string _apiKey;

        // Model configuration - only use active models from Groq docs
        private const string INTENT_MODEL = "llama-3.3-70b-versatile";
        private const string ENTITY_MODEL = "llama-3.3-70b-versatile";
        private const string CHAT_MODEL = "llama-3.2-90b-text-preview";
        private const string TRANSLATE_MODEL = "llama-3.2-11b-text-preview";

        // Cache expiration time (1 hour for responses)
        private static readonly TimeSpan CACHE_EXPIRATION = TimeSpan.FromHours(1);

        public GroqAIService(HttpClient httpClient, IConfiguration configuration, ILogger<GroqAIService> logger, ICacheService cacheService)
        {
            _httpClient = httpClient;
            _logger = logger;
            _cacheService = cacheService;
            _apiKey = configuration["Groq:ApiKey"];

            _httpClient.BaseAddress = new Uri("https://api.groq.com/openai/v1/");
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");
        }

        public async Task<IntentResultDto> ClassifyIntentAsync(string message, string language)
        {
            var systemPrompt = @"You are an intent classifier for BEESRS restaurant and location discovery system.

Available intents:
1. search_location - User wants to find restaurants, bars, places
2. food_consultation - User asks about food, dishes, cuisine, cooking advice, food recommendations
3. culture_consultation - User asks about cultural customs, traditions, etiquette, festivals, cultural practices
4. culture_advice - User asks about cultural customs or etiquette (legacy)
5. workplace_etiquette - User asks about workplace cultural practices
6. emergency_assistance - User needs urgent help (hospital, police, embassy)
7. event_planning - User wants to plan group events
8. itinerary_planning - User wants to plan personal trips
9. general_query - Other questions

Respond ONLY with valid JSON in this exact format:
{
  ""intent"": ""intent_name"",
  ""confidence"": 0.95,
  ""reasoning"": ""brief explanation""
}

DO NOT include any text before or after the JSON.";

            var request = new GroqChatRequest
            {
                Model = INTENT_MODEL,
                Messages = new List<GroqMessage>
                {
                    new GroqMessage { Role = "system", Content = systemPrompt },
                    new GroqMessage { Role = "user", Content = $"Language: {language}\nMessage: {message}" }
                },
                Temperature = 0.3,
                MaxTokens = 200
            };

            try
            {
                var response = await SendGroqRequestAsync(request);
                var content = response.Choices[0].Message.Content.Trim();

                // Clean up response thoroughly
                content = CleanJsonResponse(content);

                _logger.LogInformation($"Cleaned JSON response: {content}");

                var result = JsonSerializer.Deserialize<IntentResultDto>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                // Validate result
                if (string.IsNullOrEmpty(result?.Intent))
                {
                    _logger.LogWarning("Intent is null or empty, using default");
                    return new IntentResultDto
                    {
                        Intent = "general_query",
                        Confidence = 0.5,
                        Reasoning = "Unable to determine specific intent"
                    };
                }

                _logger.LogInformation($"Intent classified: {result.Intent} (confidence: {result.Confidence})");
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error classifying intent");
                return new IntentResultDto
                {
                    Intent = "general_query",
                    Confidence = 0.5,
                    Reasoning = "Error in classification, defaulting to general query"
                };
            }
        }

        public async Task<List<ExtractedEntityDto>> ExtractEntitiesAsync(string message, string language)
        {
            var systemPrompt = @"Extract entities from the user message for restaurant/location search.

Entity types:
- cuisine: Type of food (vietnamese, italian, vegetarian, seafood, etc.)
- price_range: Budget (cheap, moderate, expensive, luxury)
- location: Place reference (near office, downtown, District 1, Thao Dien, etc.)
- distance: Radius (nearby, 1km, 5km, walking distance)
- dietary: Dietary restrictions (halal, vegan, gluten-free, vegetarian)
- features: Special features (wifi, parking, outdoor seating, live music)
- time: When (lunch, dinner, weekend, tonight, tomorrow)
- party_size: Number of people (2, 5, 10, etc.)
- country: Country name for cultural queries
- topic: Topic for advice (dining, greeting, business, gift-giving)

Respond ONLY with valid JSON:
{
  ""entities"": [
    {""type"": ""cuisine"", ""value"": ""vegetarian"", ""confidence"": 0.95},
    {""type"": ""location"", ""value"": ""near office"", ""confidence"": 0.88}
  ]
}

DO NOT include any text before or after the JSON.";

            var request = new GroqChatRequest
            {
                Model = ENTITY_MODEL,
                Messages = new List<GroqMessage>
                {
                    new GroqMessage { Role = "system", Content = systemPrompt },
                    new GroqMessage { Role = "user", Content = $"Language: {language}\nMessage: {message}" }
                },
                Temperature = 0.2,
                MaxTokens = 300
            };

            try
            {
                var response = await SendGroqRequestAsync(request);
                var content = response.Choices[0].Message.Content.Trim();

                // Clean JSON response
                content = CleanJsonResponse(content);

                _logger.LogInformation($"Entity extraction response: {content}");

                var result = JsonSerializer.Deserialize<EntityExtractionResponse>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (result?.Entities != null)
                {
                    foreach (var entity in result.Entities)
                    {
                        entity.Value = NormalizeEntityValue(entity.Type, entity.Value);
                    }
                    return result.Entities;
                }

                return new List<ExtractedEntityDto>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting entities");
                return new List<ExtractedEntityDto>();
            }
        }

        public async Task<string> GenerateResponseAsync(
            string message,
            string intent,
            List<ExtractedEntityDto> entities,
            List<ChatMessage> conversationHistory,
            string language)
        {
            // Guard against null intent
            if (string.IsNullOrEmpty(intent))
            {
                intent = "general_query";
                _logger.LogWarning("Intent was null, using general_query");
            }

            // Create cache key based on message, intent, and language
            // For consultation intents, we cache based on the message content
            var cacheKey = $"groq_response:{intent}:{language}:{CreateCacheKey(message, entities)}";

            // Try to get from cache first
            try
            {
                var cachedResponse = await _cacheService.GetAsync<string>(cacheKey);
                if (!string.IsNullOrEmpty(cachedResponse))
                {
                    _logger.LogInformation($"Cache hit for key: {cacheKey}");
                    return cachedResponse;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, $"Error reading from cache for key: {cacheKey}");
            }

            // Always use English for responses, regardless of input language
            var systemPrompt = GetSystemPromptByIntent(intent, "en");

            var messages = new List<GroqMessage>
            {
                new GroqMessage { Role = "system", Content = systemPrompt }
            };

            // Add conversation history (last 5 messages)
            if (conversationHistory != null && conversationHistory.Any())
            {
                foreach (var msg in conversationHistory.TakeLast(5))
                {
                    messages.Add(new GroqMessage
                    {
                        Role = msg.SenderType == "user" ? "user" : "assistant",
                        Content = msg.MessageText
                    });
                }
            }

            // Add current message with context
            // Note: User can ask in any language, but we always respond in English
            var contextInfo = $"Intent: {intent}\nEntities: {JsonSerializer.Serialize(entities)}\n\nUser message (may be in any language): {message}\n\nIMPORTANT: Respond in English only, regardless of the user's language.";
            messages.Add(new GroqMessage { Role = "user", Content = contextInfo });

            var request = new GroqChatRequest
            {
                Model = CHAT_MODEL,
                Messages = messages,
                Temperature = 0.7,
                MaxTokens = 800
            };

            try
            {
                var response = await SendGroqRequestAsync(request);
                var responseText = response.Choices[0].Message.Content;

                // Cache the response
                try
                {
                    await _cacheService.SetAsync(cacheKey, responseText, CACHE_EXPIRATION);
                    _logger.LogInformation($"Cached response for key: {cacheKey}");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, $"Error caching response for key: {cacheKey}");
                }

                return responseText;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating response");
                // Always return error message in English
                return "Sorry, I encountered an error processing your request. Please try again.";
            }
        }

        private string CreateCacheKey(string message, List<ExtractedEntityDto> entities)
        {
            // Create a hash-based key from message and entities
            var keyParts = new List<string> { message.ToLower().Trim() };
            
            if (entities != null && entities.Any())
            {
                var entityString = string.Join("|", entities.OrderBy(e => e.Type).Select(e => $"{e.Type}:{e.Value}"));
                keyParts.Add(entityString);
            }

            var combinedKey = string.Join("::", keyParts);
            // Use a simple hash (in production, consider using a proper hash function)
            var hash = combinedKey.GetHashCode().ToString("X");
            return hash;
        }

        public async Task<string> TranslateAsync(string text, string targetLanguage)
        {
            var systemPrompt = $"Translate the following text to {targetLanguage}. Maintain the tone and meaning. Respond with ONLY the translated text, no explanations.";

            var request = new GroqChatRequest
            {
                Model = TRANSLATE_MODEL,
                Messages = new List<GroqMessage>
                {
                    new GroqMessage { Role = "system", Content = systemPrompt },
                    new GroqMessage { Role = "user", Content = text }
                },
                Temperature = 0.3,
                MaxTokens = 500
            };

            try
            {
                var response = await SendGroqRequestAsync(request);
                return response.Choices[0].Message.Content;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error translating text");
                return text; // Return original if translation fails
            }
        }

        private async Task<GroqChatResponse> SendGroqRequestAsync(GroqChatRequest request)
        {
            // Updated fallback models - only use active models
            var fallbackModels = new Dictionary<string, string[]>
            {
                [INTENT_MODEL] = new[] { "llama-3.3-70b-versatile", "llama-3.2-90b-text-preview", "llama-3.2-11b-text-preview" },
                [ENTITY_MODEL] = new[] { "llama-3.3-70b-versatile", "llama-3.2-90b-text-preview", "llama-3.2-11b-text-preview" },
                [CHAT_MODEL] = new[] { "llama-3.2-90b-text-preview", "llama-3.2-11b-text-preview", "llama-3.3-70b-versatile" },
                [TRANSLATE_MODEL] = new[] { "llama-3.2-11b-text-preview", "llama-3.3-70b-versatile", "llama-3.2-90b-text-preview" }
            };

            var originalModel = request.Model;
            var modelsToTry = fallbackModels.ContainsKey(originalModel)
                ? fallbackModels[originalModel]
                : new[] { originalModel, "llama-3.3-70b-versatile", "llama-3.2-90b-text-preview" };

            foreach (var model in modelsToTry)
            {
                try
                {
                    request.Model = model;
                    _logger.LogInformation($"Trying model: {model}");

                    var response = await _httpClient.PostAsJsonAsync("chat/completions", request);

                    if (response.IsSuccessStatusCode)
                    {
                        var result = await response.Content.ReadFromJsonAsync<GroqChatResponse>();
                        _logger.LogInformation($"Successfully used model: {model}");
                        return result;
                    }

                    var errorBody = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning($"Model {model} failed with status {response.StatusCode}: {errorBody}");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error with model {model}");
                }
            }

            throw new Exception($"All fallback models failed for original model: {originalModel}");
        }

        private string GetSystemPromptByIntent(string intent, string language)
        {
            // Default to general_query if intent is null or empty
            if (string.IsNullOrEmpty(intent))
            {
                intent = "general_query";
            }

            // CRITICAL: Always respond in English, regardless of user's input language
            var languageInstruction = "IMPORTANT: You must respond ONLY in English, even if the user asks in Vietnamese, Chinese, Japanese, or any other language. The user can ask in any language, but your response must always be in English.";

            var prompts = new Dictionary<string, string>
            {
                ["general_query"] = $@"You are a helpful assistant for BEESRS (Broadcom Expat Employee Social Recommendation System).
{languageInstruction}
Style: Friendly, helpful, informative, culturally aware
Task: Answer questions about:
- Local culture, customs, and traditions
- Food culture and dining etiquette
- Social activities and entertainment
- Transportation and getting around
- Local events and festivals
- Language tips and common phrases
- General information about the area
- Any other questions users might have

Be culturally sensitive and provide practical, accurate information.
Keep response under 150 words. Remember: Always respond in English only.",

                ["search_location"] = $@"You are a helpful restaurant and location assistant for BEESRS.
{languageInstruction}
Style: Friendly, enthusiastic, concise
Task: Help users find the perfect place based on their preferences.
Format:
- Acknowledge their request
- Summarize what you understand they're looking for
- Be encouraging and helpful
Keep response under 100 words. Remember: Always respond in English only.",

                ["culture_advice"] = $@"You are a cultural advisor specializing in international customs.
{languageInstruction}
Style: Respectful, informative, practical
Task: Provide accurate cultural information and etiquette advice.
Format:
- Brief introduction
- Key points (2-3 main items)
- Practical tips
- Cultural context
Keep response under 150 words. Remember: Always respond in English only.",

                ["workplace_etiquette"] = $@"You are an expert in cross-cultural workplace etiquette.
{languageInstruction}
Style: Professional, practical, respectful
Task: Help employees navigate workplace cultural differences.
Format:
- Acknowledge the situation
- Do's and Don'ts (3-4 points)
- Practical examples
Keep response under 150 words. Remember: Always respond in English only.",

                ["emergency_assistance"] = $@"You are an emergency assistance bot.
{languageInstruction}
Style: Calm, clear, direct, actionable
Task: Provide immediate help and information.
Format:
- Acknowledge urgency
- Provide specific location/contact info
- Clear next steps
Keep response under 80 words. Be concise and helpful. Remember: Always respond in English only.",

                ["event_planning"] = $@"You are an event planning assistant.
{languageInstruction}
Style: Organized, helpful, proactive
Task: Help plan group events and gatherings.
Format:
- Understand the event details
- Ask clarifying questions if needed
- Provide suggestions
Keep response under 120 words. Remember: Always respond in English only.",

                ["itinerary_planning"] = $@"You are a travel itinerary planner.
{languageInstruction}
Style: Enthusiastic, organized, helpful
Task: Help plan personal trips and daily schedules.
Format:
- Understand the trip details
- Suggest structure
- Be practical
Keep response under 120 words. Remember: Always respond in English only.",

                ["food_consultation"] = $@"You are a food and cuisine expert specializing in Asian and international cuisine.
{languageInstruction}
Style: Friendly, knowledgeable, enthusiastic about food
Task: Provide food consultation, recommendations, and information about dishes, cuisine, cooking methods, and food culture.
Format:
- Acknowledge the food question
- Provide detailed information about the dish/cuisine
- Include cultural context and traditions
- Give practical tips (how to eat, where to find, etc.)
- Be specific and informative
Keep response under 200 words. Use emojis appropriately (🍜🍲🥢🍽️). Remember: Always respond in English only.",

                ["culture_consultation"] = $@"You are a cultural advisor specializing in Asian and international cultures.
{languageInstruction}
Style: Respectful, informative, culturally sensitive
Task: Provide cultural consultation about customs, traditions, etiquette, festivals, and cultural practices.
Format:
- Acknowledge the cultural question
- Provide accurate cultural information
- Include historical context when relevant
- Give practical etiquette tips
- Be respectful and avoid stereotypes
Keep response under 200 words. Use emojis appropriately (🎋🎌🏮🎊). Remember: Always respond in English only."
            };

            return prompts.GetValueOrDefault(intent, prompts["general_query"]);
        }

        private string NormalizeEntityValue(string type, string value)
        {
            if (string.IsNullOrEmpty(value))
                return value;

            value = value.ToLower().Trim();

            return type switch
            {
                "location" when value.Contains("office") || value.Contains("văn phòng") => "user_workplace",
                "location" when value.Contains("home") || value.Contains("nhà") => "user_home",
                "distance" when value.Contains("nearby") || value.Contains("gần") => "1000",
                "distance" when value.Contains("walking") || value.Contains("đi bộ") => "500",
                "price_range" when value.Contains("cheap") || value.Contains("rẻ") => "cheap",
                "price_range" when value.Contains("expensive") || value.Contains("đắt") => "expensive",
                "price_range" when value.Contains("moderate") || value.Contains("trung bình") => "moderate",
                _ => value
            };
        }

        // Helper method to clean JSON responses
        private string CleanJsonResponse(string content)
        {
            if (string.IsNullOrWhiteSpace(content))
                return "{}";

            // Remove markdown code blocks
            content = Regex.Replace(content, @"```[jJ][sS][oO][nN]?\s*", "");
            content = content.Replace("```", "").Trim();

            // Remove any non-printable characters
            content = Regex.Replace(content, @"[^\x20-\x7E\r\n]", "");

            // Find JSON object boundaries
            var startIndex = content.IndexOf('{');
            var endIndex = content.LastIndexOf('}');

            if (startIndex >= 0 && endIndex >= 0 && endIndex > startIndex)
            {
                content = content.Substring(startIndex, endIndex - startIndex + 1);
            }

            return content;
        }

        // DTOs for Groq API
        private class GroqChatRequest
        {
            [JsonPropertyName("model")]
            public string Model { get; set; }

            [JsonPropertyName("messages")]
            public List<GroqMessage> Messages { get; set; }

            [JsonPropertyName("temperature")]
            public double Temperature { get; set; }

            [JsonPropertyName("max_tokens")]
            public int MaxTokens { get; set; }
        }

        private class GroqMessage
        {
            [JsonPropertyName("role")]
            public string Role { get; set; }

            [JsonPropertyName("content")]
            public string Content { get; set; }
        }

        private class GroqChatResponse
        {
            [JsonPropertyName("id")]
            public string Id { get; set; }

            [JsonPropertyName("choices")]
            public List<GroqChoice> Choices { get; set; }

            [JsonPropertyName("usage")]
            public GroqUsage Usage { get; set; }
        }

        private class GroqChoice
        {
            [JsonPropertyName("index")]
            public int Index { get; set; }

            [JsonPropertyName("message")]
            public GroqMessage Message { get; set; }

            [JsonPropertyName("finish_reason")]
            public string FinishReason { get; set; }
        }

        private class GroqUsage
        {
            [JsonPropertyName("prompt_tokens")]
            public int PromptTokens { get; set; }

            [JsonPropertyName("completion_tokens")]
            public int CompletionTokens { get; set; }

            [JsonPropertyName("total_tokens")]
            public int TotalTokens { get; set; }
        }

        private class EntityExtractionResponse
        {
            [JsonPropertyName("entities")]
            public List<ExtractedEntityDto> Entities { get; set; }
        }

        /// <summary>
        /// Generate an image prompt from itinerary data
        /// </summary>
        public async Task<string> GenerateImagePromptAsync(
            string title,
            string description,
            string tripType,
            string destinationCity,
            string destinationCountry)
        {
            try
            {
                var systemPrompt = @"You are an expert at creating detailed, vivid image prompts for travel photography. 
Your task is to create a single, concise image generation prompt (max 200 words) that captures the essence of a travel itinerary.

The prompt should:
- Be descriptive and vivid
- Focus on the destination and trip type
- Include visual elements like landscapes, architecture, activities
- Be suitable for generating a cover image for a travel itinerary
- Be in English
- Avoid mentioning specific dates or personal information";

                var userPrompt = $@"Create an image generation prompt for this travel itinerary:

Title: {title}
Description: {description ?? "No description"}
Trip Type: {tripType}
Destination: {destinationCity}, {destinationCountry}

Generate a single, detailed prompt that would create a beautiful cover image representing this trip. 
The prompt should be vivid, descriptive, and capture the essence of the destination and trip type.
Return ONLY the prompt text, no additional explanation.";

                var messages = new List<GroqMessage>
                {
                    new GroqMessage { Role = "system", Content = systemPrompt },
                    new GroqMessage { Role = "user", Content = userPrompt }
                };

                var request = new GroqChatRequest
                {
                    Model = CHAT_MODEL,
                    Messages = messages,
                    Temperature = 0.8,
                    MaxTokens = 300
                };

                var response = await SendGroqRequestAsync(request);
                var prompt = response.Choices[0].Message.Content.Trim();

                // Clean up the prompt (remove quotes if wrapped)
                if (prompt.StartsWith("\"") && prompt.EndsWith("\""))
                {
                    prompt = prompt.Substring(1, prompt.Length - 2);
                }

                return prompt;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating image prompt");
                // Fallback prompt
                return $"Beautiful travel destination in {destinationCity}, {destinationCountry}, {tripType} trip, scenic view, professional photography, high quality";
            }
        }
    }
}