using System;
using System.Threading.Tasks;
using Application.Models;

namespace Application.Interfaces
{
    public interface IPreferenceAggregationService
    {
        Task<AggregatedPreferences> AggregatePreferencesAsync(Guid eventId);
    }
}



















































































