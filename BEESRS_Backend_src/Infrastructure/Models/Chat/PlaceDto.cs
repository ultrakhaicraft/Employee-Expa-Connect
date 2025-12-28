using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.Chat
{
    public class PlaceDtoChat
    {
        public string PlaceId { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double Rating { get; set; }
        public int PriceLevel { get; set; }
        public double Distance { get; set; }
        public string Category { get; set; }

        // THÊM CÁC THUỘC TÍNH MỚI NÀY
        public string PhoneNumber { get; set; }
        public string Website { get; set; }
        public string MapUrl { get; set; }
        public bool IsOpenNow { get; set; }
        public string OpeningHours { get; set; }
        public int TotalRatings { get; set; }
        public List<string> Types { get; set; }
    }
}
