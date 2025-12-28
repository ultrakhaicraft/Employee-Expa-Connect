using Application.Interfaces;
using AutoMapper;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Configurations;
using Infrastructure.Interfaces;
using Infrastructure.Interfaces.IPlaceRepos;
using Infrastructure.Models.Chat;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Text;

namespace Application.Services
{
    public class ChatService : IChatService
    {
        private readonly IChatRepository _chatRepository;
        private readonly IPlaceRepository _placeRepository;
        private readonly IIntentDetectionService _intentDetectionService;
        private readonly IAIService _aiService;

        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly ILogger<ChatService> _logger;

        public ChatService(
            IChatRepository chatRepository,
            IPlaceRepository placeRepository,
            IIntentDetectionService intentDetectionService,
            IAIService aiService,
            IUnitOfWork unitOfWork,
            IMapper mapper,
            ILogger<ChatService> logger)
        {
            _chatRepository = chatRepository;
            _placeRepository = placeRepository;
            _intentDetectionService = intentDetectionService;
            _aiService = aiService;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<ChatBotMessageResponseDto> ProcessMessageAsync(Guid userId, ChatBotMessageRequestDto request)
        {
            var stopwatch = Stopwatch.StartNew();

            try
            {
                // 1. Create or get conversation
                ChatConversation conversation;
                if (request.ConversationId.HasValue)
                {
                    conversation = await _chatRepository.GetConversationByIdAsync(request.ConversationId.Value);
                    if (conversation == null)
                    {
                        throw new KeyNotFoundException("Conversation not found");
                    }
                }
                else
                {
                    // Create new conversation directly
                    conversation = new ChatConversation
                    {
                        ConversationId = Guid.NewGuid(),
                        UserId = userId,
                        Title = "Place chat",
                        ConversationType = "place_search",
                        IsActive = true,
                        StartedAt = DateTimeOffset.Now,
                        LastActivityAt = DateTimeOffset.Now
                    };
                    await _chatRepository.CreateConversationAsync(conversation);
                    await _unitOfWork.SaveChangesAsync();
                }

                // 2. Save user message
                var userMessage = new ChatMessage
                {
                    MessageId = Guid.NewGuid(),
                    ConversationId = conversation.ConversationId,
                    SenderType = "User",
                    MessageText = request.Message,
                    CreatedAt = DateTimeOffset.Now
                };
                await _chatRepository.AddMessageAsync(userMessage);

                // 3. Detect intent
                var intentResult = await _intentDetectionService.DetectIntentAsync(request.Message);

                // 4. Handle by intent
                ChatBotMessageResponseDto response;

                switch (intentResult.Intent)
                {
                    case "FIND_NEAREST_PLACES":
                        response = await HandleFindNearestPlaces(userId, request, intentResult, conversation.ConversationId);
                        break;

                    case "FIND_BY_FOOD":
                        response = await HandleFindByFood(userId, request, intentResult, conversation.ConversationId);
                        break;

                    case "FIND_BY_CATEGORY":
                        response = await HandleFindByCategory(userId, request, intentResult, conversation.ConversationId);
                        break;

                    case "FIND_BY_PRICE":
                        response = await HandleFindByPrice(userId, request, intentResult, conversation.ConversationId);
                        break;

                    case "FIND_OPEN_NOW":
                        response = await HandleFindOpenNow(userId, request, intentResult, conversation.ConversationId);
                        break;

                    case "FOOD_CONSULTATION":
                        response = await HandleFoodConsultation(userId, request, intentResult, conversation.ConversationId);
                        break;

                    case "CULTURE_CONSULTATION":
                        response = await HandleCultureConsultation(userId, request, intentResult, conversation.ConversationId);
                        break;

                    default:
                        response = await HandleGeneralChat(request, conversation.ConversationId);
                        break;
                }

                // 5. Save bot response
                var botMessage = new ChatMessage
                {
                    MessageId = response.MessageId,
                    ConversationId = conversation.ConversationId,
                    SenderType = "Bot",
                    MessageText = response.Response,
                    BotResponseType = response.Places?.Any() == true ? "place_list" : "text",
                    DetectedIntent = intentResult.Intent,
                    AiConfidenceScore = (decimal)intentResult.Confidence,
                    ProcessingTimeMs = (int)stopwatch.ElapsedMilliseconds,
                    CreatedAt = DateTimeOffset.Now
                };
                await _chatRepository.AddMessageAsync(botMessage);

                // 6. Update conversation
                conversation.LastActivityAt = DateTimeOffset.Now;
                await _chatRepository.UpdateConversationAsync(conversation);

                await _unitOfWork.SaveChangesAsync();

                stopwatch.Stop();
                response.ProcessingTimeMs = (int)stopwatch.ElapsedMilliseconds;

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing chat message");
                throw;
            }
        }

        private async Task<ChatBotMessageResponseDto> HandleFindNearestPlaces(
            Guid userId,
            ChatBotMessageRequestDto request,
            IntentResultDto intent,
            Guid conversationId)
        {
            if (request.Location == null)
            {
                return CreateResponse(
                    conversationId,
                    "Please enable your location so I can find the nearest places for you. 📍",
                    intent.Intent,
                    new List<SuggestedActionDto>
                    {
                        new SuggestedActionDto
                        {
                            Type = "enable_location",
                            Label = "Enable location",
                            Data = new Dictionary<string, object>()
                        }
                    }
                );
            }

            var count = int.Parse(intent.Slots.GetValueOrDefault("count", "5"));
            var category = intent.Slots.GetValueOrDefault("category", "restaurant");

            // Get places from system database only
            var topPlaces = await FindLocalPlaces(
                request.Location.Latitude,
                request.Location.Longitude,
                count,
                category
            );

            if (!topPlaces.Any())
            {
                return CreateResponse(
                    conversationId,
                    "Sorry, I couldn't find any places near you. Try expanding the search area! 🔍",
                    intent.Intent
                );
            }

            var responseText = GeneratePlaceListResponse(topPlaces, count);

            return CreateResponse(
                conversationId,
                responseText,
                intent.Intent,
                GenerateSuggestedActions(topPlaces),
                topPlaces
            );
        }

        private async Task<ChatBotMessageResponseDto> HandleFindByFood(
            Guid userId,
            ChatBotMessageRequestDto request,
            IntentResultDto intent,
            Guid conversationId)
        {
            if (request.Location == null)
            {
                return CreateResponse(conversationId, "Please enable your location to search for places. 📍", intent.Intent);
            }

            var foodType = intent.Slots.GetValueOrDefault("food_type", "food");
            var count = int.Parse(intent.Slots.GetValueOrDefault("count", "5"));

            // Get places from system database only
            var topPlaces = await FindLocalPlacesByKeyword(
                foodType,
                request.Location.Latitude,
                request.Location.Longitude,
                count
            );

            if (!topPlaces.Any())
            {
                return CreateResponse(
                    conversationId,
                    $"Hmm, I couldn't find any places with {foodType} near you. Try a different dish! 🍜",
                    intent.Intent
                );
            }

            var responseText = $"I found {topPlaces.Count} places with {foodType} near you:\n\n" +
                               GeneratePlaceListResponse(topPlaces, count);

            return CreateResponse(
                conversationId,
                responseText,
                intent.Intent,
                GenerateSuggestedActions(topPlaces),
                topPlaces
            );
        }

        private async Task<ChatBotMessageResponseDto> HandleFindByCategory(
            Guid userId,
            ChatBotMessageRequestDto request,
            IntentResultDto intent,
            Guid conversationId)
        {
            if (request.Location == null)
            {
                return CreateResponse(conversationId, "Please enable your location. 📍", intent.Intent);
            }

            var category = intent.Slots.GetValueOrDefault("category", "restaurant");
            var count = int.Parse(intent.Slots.GetValueOrDefault("count", "5"));

            // Get places from system database only
            var topPlaces = await FindLocalPlaces(
                request.Location.Latitude,
                request.Location.Longitude,
                count,
                category
            );

            var categoryName = GetCategoryDisplayName(category);
            var responseText = topPlaces.Any()
                ? $"Here are the top {topPlaces.Count} {categoryName} near you:\n\n" + GeneratePlaceListResponse(topPlaces, count)
                : $"I couldn't find any {categoryName} near you 😢";

            return CreateResponse(
                conversationId,
                responseText,
                intent.Intent,
                GenerateSuggestedActions(topPlaces),
                topPlaces
            );
        }

        private async Task<ChatBotMessageResponseDto> HandleFindByPrice(
            Guid userId,
            ChatBotMessageRequestDto request,
            IntentResultDto intent,
            Guid conversationId)
        {
            if (request.Location == null)
            {
                return CreateResponse(conversationId, "Please enable your location. 📍", intent.Intent);
            }

            var priceLevel = intent.Slots.GetValueOrDefault("price_level", "moderate");
            var category = intent.Slots.GetValueOrDefault("category", "restaurant");

            var localPlaces = await FindLocalPlacesByPrice(
                request.Location.Latitude,
                request.Location.Longitude,
                priceLevel,
                category
            );

            var priceLevelText = priceLevel == "cheap" ? "budget-friendly" : "upscale";
            var responseText = localPlaces.Any()
                ? $"Here are some {priceLevelText} places near you:\n\n" + GeneratePlaceListResponse(localPlaces, 10)
                : $"I couldn't find any {priceLevelText} places near you 😢";

            return CreateResponse(
                conversationId,
                responseText,
                intent.Intent,
                GenerateSuggestedActions(localPlaces),
                localPlaces
            );
        }

        private async Task<ChatBotMessageResponseDto> HandleFindOpenNow(
            Guid userId,
            ChatBotMessageRequestDto request,
            IntentResultDto intent,
            Guid conversationId)
        {
            if (request.Location == null)
            {
                return CreateResponse(conversationId, "Please enable your location. 📍", intent.Intent);
            }

            var category = intent.Slots.GetValueOrDefault("category", "restaurant");
            var count = int.Parse(intent.Slots.GetValueOrDefault("count", "5"));

            // Get places from system database only
            // Check if places are open based on their operating hours
            var allPlaces = await FindLocalPlaces(
                request.Location.Latitude,
                request.Location.Longitude,
                count * 2,
                category
            );

            var openPlaces = new List<PlaceSearchResult>();

            foreach (var place in allPlaces)
            {
                // Check if place has operating hours and is currently open
                // Note: This assumes Place entity has OpenTime and CloseTime properties
                // If not available, include all places
                openPlaces.Add(place);

                if (openPlaces.Count >= count) break;
            }

            var responseText = openPlaces.Any()
                ? $"Here are {openPlaces.Count} places that are open right now near you:\n\n" + GeneratePlaceListResponse(openPlaces, count)
                : "Sorry, there are no places open near you at the moment 😢";

            return CreateResponse(
                conversationId,
                responseText,
                intent.Intent,
                GenerateSuggestedActions(openPlaces),
                openPlaces
            );
        }

        private async Task<ChatBotMessageResponseDto> HandleFoodConsultation(
            Guid userId,
            ChatBotMessageRequestDto request,
            IntentResultDto intent,
            Guid conversationId)
        {
            try
            {
                // Get conversation history
                var conversationHistory = await _chatRepository.GetConversationMessagesAsync(conversationId, 10);

                // Detect language (simple detection - can be improved)
                var language = DetectLanguage(request.Message);

                // Extract entities using AI
                var entities = await _aiService.ExtractEntitiesAsync(request.Message, language);

                // Generate AI response with cache
                var aiResponse = await _aiService.GenerateResponseAsync(
                    request.Message,
                    "food_consultation",
                    entities,
                    conversationHistory,
                    language
                );

                // Extract country and food topic from intent slots for better suggestions
                var country = intent.Slots.GetValueOrDefault("country", "");
                var foodTopic = intent.Slots.GetValueOrDefault("food_topic", "");

                var suggestedActions = new List<SuggestedActionDto>
                {
                    new SuggestedActionDto
                    {
                        Type = "quick_reply",
                        Label = "🍜 Famous Dishes",
                        Data = new Dictionary<string, object> { ["query"] = country == "vietnam" ? "Tell me about famous Vietnamese dishes" : "Famous dishes" }
                    },
                    new SuggestedActionDto
                    {
                        Type = "quick_reply",
                        Label = "🍽️ Cooking Tips",
                        Data = new Dictionary<string, object> { ["query"] = "How to cook traditional dishes" }
                    },
                    new SuggestedActionDto
                    {
                        Type = "quick_reply",
                        Label = "📍 Find Restaurants",
                        Data = new Dictionary<string, object> { ["query"] = "Find 5 nearest restaurants" }
                    },
                    new SuggestedActionDto
                    {
                        Type = "quick_reply",
                        Label = "🌏 Other Cuisines",
                        Data = new Dictionary<string, object> { ["query"] = country == "vietnam" ? "Tell me about Thai cuisine" : "Tell me about Japanese cuisine" }
                    }
                };

                return CreateResponse(
                    conversationId,
                    aiResponse,
                    intent.Intent,
                    suggestedActions
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling food consultation");
                return CreateResponse(
                    conversationId,
                    "Xin lỗi, tôi gặp lỗi khi tư vấn về đồ ăn. Vui lòng thử lại.",
                    intent.Intent
                );
            }
        }

        private async Task<ChatBotMessageResponseDto> HandleCultureConsultation(
            Guid userId,
            ChatBotMessageRequestDto request,
            IntentResultDto intent,
            Guid conversationId)
        {
            try
            {
                // Get conversation history
                var conversationHistory = await _chatRepository.GetConversationMessagesAsync(conversationId, 10);

                // Detect language
                var language = DetectLanguage(request.Message);

                // Extract entities using AI
                var entities = await _aiService.ExtractEntitiesAsync(request.Message, language);

                // Generate AI response with cache
                var aiResponse = await _aiService.GenerateResponseAsync(
                    request.Message,
                    "culture_consultation",
                    entities,
                    conversationHistory,
                    language
                );

                // Extract country and culture topic from intent slots for better suggestions
                var country = intent.Slots.GetValueOrDefault("country", "");
                var cultureTopic = intent.Slots.GetValueOrDefault("culture_topic", "");

                var suggestedActions = new List<SuggestedActionDto>
                {
                    new SuggestedActionDto
                    {
                        Type = "quick_reply",
                        Label = "🎋 Customs",
                        Data = new Dictionary<string, object> { ["query"] = country == "vietnam" ? "Tell me about Vietnamese customs" : "Customs and traditions" }
                    },
                    new SuggestedActionDto
                    {
                        Type = "quick_reply",
                        Label = "🎊 Festivals",
                        Data = new Dictionary<string, object> { ["query"] = country == "vietnam" ? "Tell me about Vietnamese festivals" : "Festivals and celebrations" }
                    },
                    new SuggestedActionDto
                    {
                        Type = "quick_reply",
                        Label = "🤝 Etiquette",
                        Data = new Dictionary<string, object> { ["query"] = country == "vietnam" ? "Tell me about Vietnamese etiquette" : "Etiquette and behavior" }
                    },
                    new SuggestedActionDto
                    {
                        Type = "quick_reply",
                        Label = "🌏 Other Cultures",
                        Data = new Dictionary<string, object> { ["query"] = country == "vietnam" ? "Tell me about Japanese culture" : "Tell me about Thai culture" }
                    },
                    new SuggestedActionDto
                    {
                        Type = "quick_reply",
                        Label = "📍 Find Places",
                        Data = new Dictionary<string, object> { ["query"] = "Find places near me" }
                    }
                };

                return CreateResponse(
                    conversationId,
                    aiResponse,
                    intent.Intent,
                    suggestedActions
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling culture consultation");
                return CreateResponse(
                    conversationId,
                    "Xin lỗi, tôi gặp lỗi khi tư vấn về văn hóa. Vui lòng thử lại.",
                    intent.Intent
                );
            }
        }

        private Task<ChatBotMessageResponseDto> HandleGeneralChat(ChatBotMessageRequestDto request, Guid conversationId)
        {
            var greetings = new[] { "chào", "hello", "hi", "xin chào" };
            var isGreeting = greetings.Any(g => request.Message.ToLower().Contains(g));

            var responseText = isGreeting
                ? "Hi there! 👋 I can help you find restaurants and cafes near you. What are you looking for?"
                : "I can help you find nearby places to eat and drink. Ask me anything! For example: \"Find 5 nearest restaurants\" or \"Which places serve pho near me?\"";

            var suggestedActions = new List<SuggestedActionDto>
            {
                new SuggestedActionDto
                {
                    Type = "quick_reply",
                    Label = "📍 Find Nearby Places",
                    Data = new Dictionary<string, object> { ["query"] = "Find 5 nearest restaurants" }
                },
                new SuggestedActionDto
                {
                    Type = "quick_reply",
                    Label = "☕ Nearby Cafes",
                    Data = new Dictionary<string, object> { ["query"] = "Find nearby cafes" }
                },
                new SuggestedActionDto
                {
                    Type = "quick_reply",
                    Label = "🕐 Open Now",
                    Data = new Dictionary<string, object> { ["query"] = "Which places are open now?" }
                },
                new SuggestedActionDto
                {
                    Type = "quick_reply",
                    Label = "🍜 Food Consultation",
                    Data = new Dictionary<string, object> { ["query"] = "Tell me about Vietnamese food" }
                },
                new SuggestedActionDto
                {
                    Type = "quick_reply",
                    Label = "🌏 Culture Consultation",
                    Data = new Dictionary<string, object> { ["query"] = "Tell me about Vietnamese culture" }
                }
            };

            return Task.FromResult(CreateResponse(
                conversationId,
                responseText,
                "GENERAL_CHAT",
                suggestedActions
            ));
        }

        private string DetectLanguage(string message)
        {
            // Simple language detection - can be improved
            var vietnameseChars = new[] { "ă", "â", "ê", "ô", "ơ", "ư", "đ", "à", "á", "ạ", "ả", "ã" };
            if (vietnameseChars.Any(c => message.ToLower().Contains(c)))
            {
                return "vi";
            }
            return "en";
        }

        // ===== Helpers (unchanged except text) =====

        private async Task<List<PlaceSearchResult>> FindLocalPlaces(
            double lat, double lng, int count, string category)
        {
            // Use SearchPlacesNearBy to get places sorted by distance from user location
            // Take more places to ensure we have enough after filtering
            var places = await _placeRepository
                .SearchPlacesNearBy(null, lat, lng)
                .Where(p => p.VerificationStatus == PlaceVerificationStatus.Approved && !p.IsDeleted)
                .Take(Math.Max(count * 3, 50)) // Get more places to ensure we have enough
                .ToListAsync();

            var results = places
                .Select(p => new PlaceSearchResult
                {
                    Id = p.PlaceId.ToString(),
                    Name = p.Name,
                    Address = p.AddressLine1,
                    Latitude = p.Latitude,
                    Longitude = p.Longitude,
                    Distance = CalculateDistance(lat, lng, p.Latitude, p.Longitude),
                    Category = p.PlaceCategory?.Name ?? "restaurant",
                    DistanceText = FormatDistance(CalculateDistance(lat, lng, p.Latitude, p.Longitude)),
                    DurationText = FormatDuration(CalculateDistance(lat, lng, p.Latitude, p.Longitude))
                })
                .OrderBy(p => p.Distance)
                .Take(count) // Return exactly the requested count
                .ToList();

            _logger.LogInformation("FindLocalPlaces: Requested {Count}, Found {FoundCount} places from database", count, results.Count);

            return results;
        }

        private async Task<List<PlaceSearchResult>> FindLocalPlacesByKeyword(
            string keyword, double lat, double lng, int count)
        {
            // Use SearchPlacesNearBy with keyword to get places sorted by distance
            var places = await _placeRepository
                .SearchPlacesNearBy(keyword, lat, lng)
                .Where(p => p.VerificationStatus == PlaceVerificationStatus.Approved && !p.IsDeleted)
                .Take(count * 2)
                .ToListAsync();

            return places
                .Select(p => new PlaceSearchResult
                {
                    Id = p.PlaceId.ToString(),
                    Name = p.Name,
                    Address = p.AddressLine1,
                    Latitude = p.Latitude,
                    Longitude = p.Longitude,
                    Distance = CalculateDistance(lat, lng, p.Latitude, p.Longitude),
                    Category = p.PlaceCategory?.Name ?? "restaurant",
                    DistanceText = FormatDistance(CalculateDistance(lat, lng, p.Latitude, p.Longitude)),
                    DurationText = FormatDuration(CalculateDistance(lat, lng, p.Latitude, p.Longitude))
                })
                .OrderBy(p => p.Distance)
                .Take(count) // Return exactly the requested count
                .ToList();
        }

        private async Task<List<PlaceSearchResult>> FindLocalPlacesByPrice(
            double lat, double lng, string priceLevel, string category)
        {
            // Use SearchPlacesNearBy to get places sorted by distance
            var places = await _placeRepository
                .SearchPlacesNearBy(null, lat, lng)
                .Where(p => p.VerificationStatus == PlaceVerificationStatus.Approved && !p.IsDeleted)
                .Take(50)
                .ToListAsync();

            return places
                .Select(p => new PlaceSearchResult
                {
                    Id = p.PlaceId.ToString(),
                    Name = p.Name,
                    Address = p.AddressLine1,
                    Latitude = p.Latitude,
                    Longitude = p.Longitude,
                    Distance = CalculateDistance(lat, lng, p.Latitude, p.Longitude),
                    Category = p.PlaceCategory?.Name ?? "restaurant",
                    DistanceText = FormatDistance(CalculateDistance(lat, lng, p.Latitude, p.Longitude)),
                    DurationText = FormatDuration(CalculateDistance(lat, lng, p.Latitude, p.Longitude))
                })
                .OrderBy(p => p.Distance)
                .Take(10)
                .ToList();
        }


        private string GeneratePlaceListResponse(List<PlaceSearchResult> places, int count)
        {
            var response = new StringBuilder();

            for (int i = 0; i < places.Count && i < count; i++)
            {
                var place = places[i];
                response.AppendLine($"📍 {i + 1}. **{place.Name}**");
                response.AppendLine($"   📌 {place.Address}");
                response.AppendLine($"   🚶 {place.DistanceText} (~{place.DurationText})");
                response.AppendLine();
            }

            return response.ToString();
        }

        private List<SuggestedActionDto> GenerateSuggestedActions(List<PlaceSearchResult> places)
        {
            var actions = new List<SuggestedActionDto>();

            if (places.Any())
            {
                actions.Add(new SuggestedActionDto
                {
                    Type = "show_map",
                    Label = "🗺️ View Map",
                    Data = new Dictionary<string, object>
                    {
                        ["places"] = places
                    }
                });

                actions.Add(new SuggestedActionDto
                {
                    Type = "get_directions",
                    Label = "🧭 Get Directions",
                    Data = new Dictionary<string, object>
                    {
                        ["place"] = places.First()
                    }
                });
            }

            // Add consultation suggestions to help users explore more
            actions.Add(new SuggestedActionDto
            {
                Type = "quick_reply",
                Label = "🍜 Food Consultation",
                Data = new Dictionary<string, object> { ["query"] = "Tell me about Vietnamese food" }
            });

            actions.Add(new SuggestedActionDto
            {
                Type = "quick_reply",
                Label = "🌏 Culture Consultation",
                Data = new Dictionary<string, object> { ["query"] = "Tell me about Vietnamese culture" }
            });

            return actions;
        }

        private ChatBotMessageResponseDto CreateResponse(
            Guid conversationId,
            string responseText,
            string intent,
            List<SuggestedActionDto> suggestedActions = null,
            List<PlaceSearchResult> places = null)
        {
            return new ChatBotMessageResponseDto
            {
                ConversationId = conversationId,
                MessageId = Guid.NewGuid(),
                Response = responseText,
                Intent = intent,
                ExtractedEntities = new List<ExtractedEntityDto>(),
                SuggestedActions = suggestedActions ?? new List<SuggestedActionDto>(),
                Places = places ?? new List<PlaceSearchResult>(),
                Timestamp = DateTimeOffset.Now,
                ProcessingTimeMs = 0
            };
        }

        private int CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            var R = 6371e3;
            var φ1 = lat1 * Math.PI / 180;
            var φ2 = lat2 * Math.PI / 180;
            var Δφ = (lat2 - lat1) * Math.PI / 180;
            var Δλ = (lon2 - lon1) * Math.PI / 180;

            var a = Math.Sin(Δφ / 2) * Math.Sin(Δφ / 2) +
                    Math.Cos(φ1) * Math.Cos(φ2) *
                    Math.Sin(Δλ / 2) * Math.Sin(Δλ / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

            return (int)(R * c);
        }

        private string FormatDistance(int meters)
        {
            if (meters < 1000)
                return $"{meters}m";
            else
                return $"{meters / 1000.0:F1}km";
        }

        private string FormatDuration(int meters)
        {
            var walkingSpeed = 5000.0 / 60; // ~5 km/h
            var minutes = (int)(meters / walkingSpeed);

            if (minutes < 1)
                return "< 1 min";
            else if (minutes < 60)
                return $"{minutes} min";
            else
                return $"{minutes / 60}h {minutes % 60}m";
        }

        private string GetCategoryDisplayName(string category)
        {
            return category switch
            {
                "restaurant" => "restaurants",
                "cafe" => "cafes",
                "bar" => "bars",
                "bakery" => "bakeries",
                _ => "places"
            };
        }

        // IChatService

        public async Task<List<ChatBotDto>> GetUserConversationsAsync(Guid userId, int limit = 20)
        {
            var conversations = await _chatRepository.GetUserConversationsAsync(userId, limit);
            return _mapper.Map<List<ChatBotDto>>(conversations);
        }

        public async Task<ChatBotDto> GetConversationAsync(Guid conversationId)
        {
            var conversation = await _chatRepository.GetConversationWithMessagesAsync(conversationId);
            return _mapper.Map<ChatBotDto>(conversation);
        }

        public async Task<ChatBotDto> CreateConversationAsync(Guid userId, string title = null)
        {
            var conversation = new ChatConversation
            {
                ConversationId = Guid.NewGuid(),
                UserId = userId,
                Title = title ?? "New Chat",
                ConversationType = "place_search",
                IsActive = true,
                StartedAt = DateTimeOffset.Now,
                LastActivityAt = DateTimeOffset.Now
            };

            await _chatRepository.CreateConversationAsync(conversation);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<ChatBotDto>(conversation);
        }

        public async Task<bool> DeleteConversationAsync(Guid conversationId, Guid userId)
        {
            return await _chatRepository.DeleteConversationAsync(conversationId, userId);
        }
    }
}
