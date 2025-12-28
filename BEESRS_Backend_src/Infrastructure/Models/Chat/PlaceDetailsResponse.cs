using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.Chat
{
    public class PlaceDetailsResponse
    {
        public string Status { get; set; }
        public PlaceDetailResult Result { get; set; }
    }

    public class PlaceDetailResult
    {
        public string Name { get; set; }
        public string PlaceId { get; set; }
        public string FormattedAddress { get; set; }
        public string FormattedPhoneNumber { get; set; }
        public string InternationalPhoneNumber { get; set; }
        public PlaceGeometry Geometry { get; set; }
        public double Rating { get; set; }
        public int UserRatingsTotal { get; set; }
        public int PriceLevel { get; set; }
        public string Url { get; set; }
        public string Website { get; set; }
        public PlaceOpeningHours OpeningHours { get; set; }
        public List<string> Types { get; set; }
    }

    public class PlaceGeometry
    {
        public Location Location { get; set; }
    }

    public class Location
    {
        public double Lat { get; set; }
        public double Lng { get; set; }
    }

    public class PlaceOpeningHours
    {
        public bool OpenNow { get; set; }
        public List<string> WeekdayText { get; set; }
    }
}
