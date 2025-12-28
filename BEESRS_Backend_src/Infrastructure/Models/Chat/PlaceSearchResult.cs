using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.Chat
{
    public class PlaceSearchResult
    {
        // Basic Info
        public string Id { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }

        // Distance & Navigation
        public int Distance { get; set; } // in meters
        public string DistanceText { get; set; } // "500m" or "1.2km"
        public string DurationText { get; set; } // "5 phút"

        public string Category { get; set; }

        public string PhoneNumber { get; set; }
        public string Email { get; set; }
        public string Website { get; set; }
        public string Description { get; set; }
        public int PriceLevel { get; set; } // 1-4 ($-$$$$)
        public double Rating { get; set; } // 0-5.0
        public int TotalReviews { get; set; }
        public string OpeningHours { get; set; }
        public List<string> Photos { get; set; }
        public bool IsVerified { get; set; }
    }
}
