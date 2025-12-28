using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.Chat
{
    public class LocationSearchAdditionalData
    {
        public List<PlaceDto> Places { get; set; }
        public int TotalFound { get; set; }
        public string SearchQuery { get; set; }
    }

    public class PlaceDto
    {
        public string PlaceId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Category { get; set; }
        public decimal? AverageRating { get; set; }
        public int? PriceLevel { get; set; }
        public double? Distance { get; set; } // meters
        public string Address { get; set; }
        public string PhoneNumber { get; set; }
        public string WebsiteUrl { get; set; }
        public bool IsOpen { get; set; }
    }

    public class CultureAdviceAdditionalData
    {
        public string Country { get; set; }
        public string Topic { get; set; }
        public List<string> KeyPoints { get; set; }
    }

    public class EmergencyAdditionalData
    {
        public PlaceDto NearestPlace { get; set; }
        public double Distance { get; set; }
        public string EmergencyType { get; set; }
        public List<string> EmergencyContacts { get; set; }
    }
}
