using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Interfaces;
using Application.Models;
using Infrastructure.Interfaces;

namespace Application.Services
{
    public class PreferenceAggregationService : IPreferenceAggregationService
    {
        private readonly IEventParticipantRepository _participantRepository;
        private readonly IUserPreferenceRepository _preferenceRepository;

        public PreferenceAggregationService(
            IEventParticipantRepository participantRepository,
            IUserPreferenceRepository preferenceRepository)
        {
            _participantRepository = participantRepository;
            _preferenceRepository = preferenceRepository;
        }

        public async Task<AggregatedPreferences> AggregatePreferencesAsync(Guid eventId)
        {
            var acceptedParticipants = await _participantRepository.GetAcceptedParticipantIdsAsync(eventId);

            var preferences = await _preferenceRepository.GetByUserIdsAsync(acceptedParticipants);

            var aggregated = new AggregatedPreferences
            {
                ParticipantIds = acceptedParticipants
            };

            // Aggregate cuisine preferences
            var cuisineList = preferences
                .Where(p => !string.IsNullOrEmpty(p.CuisinePreferences))
                .SelectMany(p => p.CuisinePreferences.Split(',', StringSplitOptions.RemoveEmptyEntries))
                .Select(c => c.Trim())
                .ToList();

            aggregated.CuisineTypes = cuisineList
                .GroupBy(c => c)
                .OrderByDescending(g => g.Count())
                .Select(g => g.Key)
                .ToList();

            aggregated.PreferenceWeights = cuisineList
                .GroupBy(c => c)
                .ToDictionary(g => g.Key, g => g.Count());

            // Calculate average budget
            var budgets = preferences
                .Where(p => p.BudgetPreference.HasValue)
                .Select(p => p.BudgetPreference.Value)
                .ToList();

            // Treat budgets as USD; default to $30 per person if no preference provided
            aggregated.AverageBudget = budgets.Any() 
                ? (int)budgets.Average() 
                : 30;

            // Get max distance radius
            aggregated.MaxDistanceRadius = preferences
                .Select(p => p.DistanceRadius)
                .DefaultIfEmpty(10) // Default 10km
                .Max();

            // Aggregate dietary restrictions
            // Note: DietaryRestrictions property doesn't exist in UserPreference yet
            // TODO: Add DietaryRestrictions property to UserPreference entity
            aggregated.DietaryRestrictions = new List<string>(); // Empty for now

            return aggregated;
        }
    }
}

