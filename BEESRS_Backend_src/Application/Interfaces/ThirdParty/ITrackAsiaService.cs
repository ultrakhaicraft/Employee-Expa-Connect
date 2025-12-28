using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Application.Interfaces.ThirdParty
{
    public interface ITrackAsiaService
    {
        Task<List<NearbyPlace>> SearchNearbyPlacesAsync(
            double latitude,
            double longitude,
            int radius,
            string type = null);

        Task<DistanceMatrixResult> CalculateDistanceMatrixAsync(
            List<(double lat, double lng)> origins,
            (double lat, double lng) destination);

        Task<ReverseGeocodeResult> ReverseGeocodeAsync(double latitude, double longitude);

        Task<PlaceDetailResult> GetPlaceDetailAsync(string placeId);
    }

    public class NearbyPlace
    {
        public string PlaceId { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Type { get; set; }
        public double? Rating { get; set; }
        public int? PriceLevel { get; set; }
    }

    public class DistanceMatrixResult
    {
        public List<DistanceElement> Elements { get; set; }
        public double AverageDistanceKm { get; set; }
        public int AverageDurationMinutes { get; set; }
    }

    public class DistanceElement
    {
        public double DistanceKm { get; set; }
        public int DurationMinutes { get; set; }
    }

    public class ReverseGeocodeResult
    {
        public string FormattedAddress { get; set; }
        public string City { get; set; }
        public string District { get; set; }
        public string Ward { get; set; }
    }

    public class PlaceDetailResult
    {
        public string PlaceId { get; set; }
        public string Name { get; set; }
        public string FormattedAddress { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double? Rating { get; set; }
        public int? PriceLevel { get; set; }
        public List<string> Types { get; set; }
        public string PhoneNumber { get; set; }
        public string Website { get; set; }
    }
}