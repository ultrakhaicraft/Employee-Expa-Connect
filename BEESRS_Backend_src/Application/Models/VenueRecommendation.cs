using System;
using System.Collections.Generic;

namespace Application.Models
{
    public class VenueRecommendation
    {
        public Guid PlaceId { get; set; }
        public double Score { get; set; }
        public string Reasoning { get; set; }
        public List<string> Pros { get; set; } = new List<string>();
        public List<string> Cons { get; set; } = new List<string>();
        public decimal? EstimatedCostPerPerson { get; set; }
    }
}



















































































