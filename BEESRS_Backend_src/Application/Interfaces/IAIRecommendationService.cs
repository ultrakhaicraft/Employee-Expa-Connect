using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Application.Models;
using Domain.Entities;

namespace Application.Interfaces
{
    public interface IAIRecommendationService
    {
        Task<List<EventPlaceOption>> GenerateRecommendationsAsync(
            Guid eventId, 
            AggregatedPreferences preferences,
            double? searchLatitude = null,
            double? searchLongitude = null,
            double? searchRadiusKm = null);
    }
}








































