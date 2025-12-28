using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Application.Exceptions;
using Application.Interfaces;
using Application.Models;
using Domain.Entities;
using Infrastructure.Interfaces;
using Infrastructure.Interfaces.IPlaceRepos;
using Microsoft.EntityFrameworkCore;

namespace Application.Services
{
    public class AIRecommendationService : IAIRecommendationService
    {
        private readonly IEventRepository _eventRepository;
        private readonly IEventParticipantRepository _participantRepository;
        private readonly IEventPlaceOptionRepository _optionRepository;
        private readonly IPlaceRepository _placeRepository;
        private readonly IUserLocationRepository _locationRepository;
        private readonly IVenueScoringService _scoringService;

        public AIRecommendationService(
            IEventRepository eventRepository,
            IEventParticipantRepository participantRepository,
            IEventPlaceOptionRepository optionRepository,
            IPlaceRepository placeRepository,
            IUserLocationRepository locationRepository,
            IVenueScoringService scoringService)
        {
            _eventRepository = eventRepository;
            _participantRepository = participantRepository;
            _optionRepository = optionRepository;
            _placeRepository = placeRepository;
            _locationRepository = locationRepository;
            _scoringService = scoringService;
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

            // Get participant locations for distance calculation
            var participantLocations = await GetParticipantLocationsAsync(eventId);

            // Query potential venues
            var query = _placeRepository.GetAllPlace()
                .Where(p => p.IsDeleted == false && p.VerificationStatus == Domain.Enums.PlaceVerificationStatus.Approved); // Verified

            // Filter by cuisine if available
            if (preferences.CuisineTypes.Any())
            {
                query = query.Where(p => p.PlaceCategory != null && preferences.CuisineTypes.Contains(p.PlaceCategory.Name));
            }

            var potentialVenues = await query
                .Take(50) // Limit for performance
                .ToListAsync();

            if (!potentialVenues.Any())
            {
                // Fallback: get any verified venues
                potentialVenues = await _placeRepository.GetAllPlace()
                    .Where(p => p.IsDeleted == false && p.VerificationStatus == Domain.Enums.PlaceVerificationStatus.Approved)
                    .OrderByDescending(p => p.AverageRating)
                    .Take(20)
                    .ToListAsync();
            }

            // Score and rank venues
            var scoredVenues = potentialVenues
                .Select(venue => new
                {
                    Venue = venue,
                    Score = _scoringService.CalculateScore(venue, preferences, eventEntity, participantLocations),
                    Reasoning = _scoringService.GenerateReasoning(venue, preferences, eventEntity),
                    Pros = _scoringService.GeneratePros(venue, preferences, eventEntity),
                    Cons = _scoringService.GenerateCons(venue, preferences, eventEntity)
                })
                .Where(sv => sv.Score > 40) // Lower threshold for flexibility
                .OrderByDescending(sv => sv.Score)
                .Take(5)
                .ToList();

            // Create event place options
            var recommendations = new List<EventPlaceOption>();
            foreach (var scoredVenue in scoredVenues)
            {
                var option = new EventPlaceOption
                {
                    EventId = eventId,
                    PlaceId = scoredVenue.Venue.PlaceId,
                    SuggestedBy = "AI",
                    AiScore = (decimal)scoredVenue.Score,
                    AiReasoning = scoredVenue.Reasoning,
                    Pros = JsonSerializer.Serialize(scoredVenue.Pros),
                    Cons = JsonSerializer.Serialize(scoredVenue.Cons),
                    EstimatedCostPerPerson = scoredVenue.Venue.PriceLevel,
                    AddedAt = DateTimeOffset.Now
                };

                recommendations.Add(option);
                await _optionRepository.CreateAsync(option);
            }

            return recommendations;
        }

        private async Task<List<(double Latitude, double Longitude)>> GetParticipantLocationsAsync(Guid eventId)
        {
            var participantIds = await _participantRepository.GetAcceptedParticipantIdsAsync(eventId);

            var locations = await _locationRepository.GetByUserIdsAsync(participantIds);

            return locations.Select(l => ((double)l.Latitude, (double)l.Longitude)).ToList();
        }
    }
}

