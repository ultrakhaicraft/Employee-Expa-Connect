using System;
using System.Collections.Generic;

namespace Application.Models
{
    public class AggregatedPreferences
    {
        public List<string> CuisineTypes { get; set; } = new List<string>();
        public int AverageBudget { get; set; }
        public int MaxDistanceRadius { get; set; }
        public List<string> DietaryRestrictions { get; set; } = new List<string>();
        public Dictionary<string, int> PreferenceWeights { get; set; } = new Dictionary<string, int>();
        public List<Guid> ParticipantIds { get; set; } = new List<Guid>();
    }
}



















































































