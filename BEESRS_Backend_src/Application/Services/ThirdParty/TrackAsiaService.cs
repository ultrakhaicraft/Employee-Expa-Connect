using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Application.Interfaces.ThirdParty;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.Logging;

namespace Application.Services.ThirdParty
{
    public class TrackAsiaService : ITrackAsiaService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<TrackAsiaService> _logger;
        private readonly string _apiKey;
        private readonly string _singaporeApiKey;
		private const string BaseUrl = "https://maps.track-asia.com/api";
        private const string SingaporeBaseUrl = "https://sg-maps.track-asia.com/api";

		public TrackAsiaService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<TrackAsiaService> logger)
        {
            _httpClient = httpClientFactory.CreateClient();
            _logger = logger;
            _apiKey = configuration["TrackAsia:ApiKey"] ?? throw new ArgumentException("TrackAsia API Key not configured");
            _singaporeApiKey = configuration["TrackAsia:SingaporeApiKey"];
		}

        public async Task<List<NearbyPlace>> SearchNearbyPlacesAsync(
            double latitude,
            double longitude,
            int radius,
            string type = null)
        {
            try
            {
                // Sử dụng Nearby Search v2 API (format giống Google Places API)
                // Đảm bảo format số đúng (dùng dấu chấm, không dùng dấu phẩy)
                var latStr = latitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
                var lngStr = longitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
                
                var url = $"{BaseUrl}/v2/place/nearbysearch/json?location={latStr},{lngStr}&radius={radius}&key={_apiKey}";

                if (!string.IsNullOrEmpty(type))
                {
                    url += $"&type={type}";
                }

                _logger.LogInformation("TrackAsia nearby search URL: {Url}", url);
                _logger.LogInformation("TrackAsia search parameters: Lat={Lat}, Lng={Lng}, Radius={Radius}m, Type={Type}", 
                    latitude, longitude, radius, type ?? "null");

                var response = await _httpClient.GetAsync(url);
                
                _logger.LogInformation("TrackAsia response status: {StatusCode}", response.StatusCode);

                // If 404, TrackAsia API might not support nearby search endpoint
                // Return empty list and let caller fallback to database
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    _logger.LogWarning("TrackAsia nearby search endpoint not found (404). Falling back to database search.");
                    return new List<NearbyPlace>();
                }

                response.EnsureSuccessStatusCode();

                var content = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("TrackAsia response content: {Content}", content.Length > 500 ? content.Substring(0, 500) + "..." : content);
                
                // Check if content is empty or null
                if (string.IsNullOrWhiteSpace(content))
                {
                    _logger.LogWarning("TrackAsia API returned empty response body");
                    return new List<NearbyPlace>();
                }
                
                var result = JsonSerializer.Deserialize<TrackAsiaNearbyResponse>(content);
                
                // Check if deserialization failed
                if (result == null)
                {
                    _logger.LogWarning("Failed to deserialize TrackAsia response");
                    return new List<NearbyPlace>();
                }
                
                // Check API status
                if (result.Status != null && result.Status != "OK")
                {
                    _logger.LogWarning("TrackAsia API returned non-OK status: {Status}, Error: {Error}", 
                        result.Status, result.ErrorMessage ?? "No error message");
                    return new List<NearbyPlace>();
                }

                // Count total results before filtering
                var totalResults = result?.Results?.Count ?? 0;
                var placesWithoutId = result?.Results?.Count(r => string.IsNullOrEmpty(r.PlaceId)) ?? 0;
                
                var places = result?.Results?
                    .Where(r => !string.IsNullOrEmpty(r.PlaceId)) // Filter out places without PlaceId
                    .Select(r => new NearbyPlace
                    {
                        PlaceId = r.PlaceId,
                        Name = r.Name,
                        Address = r.Vicinity ?? r.FormattedAddress,
                        Latitude = r.Geometry?.Location?.Lat ?? 0,
                        Longitude = r.Geometry?.Location?.Lng ?? 0,
                        Type = r.Types?.FirstOrDefault(),
                        Rating = r.Rating,
                        PriceLevel = r.PriceLevel
                    }).ToList() ?? new List<NearbyPlace>();
                
                // Filter by actual distance (TrackAsia API may return places outside radius)
                // Calculate Haversine distance for each place
                var filteredPlaces = places
                    .Where(p => {
                        if (p.Latitude == 0 && p.Longitude == 0) return false;
                        
                        // Calculate distance using Haversine formula
                        var R = 6371000; // Earth radius in meters
                        var dLat = (p.Latitude - latitude) * Math.PI / 180;
                        var dLon = (p.Longitude - longitude) * Math.PI / 180;
                        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                                Math.Cos(latitude * Math.PI / 180) * Math.Cos(p.Latitude * Math.PI / 180) *
                                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
                        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
                        var distanceMeters = R * c;
                        
                        return distanceMeters <= radius;
                    })
                    .ToList();
                
                _logger.LogInformation("TrackAsia returned {TotalResults} places, {WithoutId} without PlaceId, {ValidCount} valid places, {FilteredCount} within {Radius}m radius", 
                    totalResults, placesWithoutId, places.Count, filteredPlaces.Count, radius);
                
                // Additional debug logging
                if (filteredPlaces.Count > 0)
                {
                    _logger.LogInformation("First filtered place: PlaceId={PlaceId}, Name={Name}, Lat={Lat}, Lng={Lng}", 
                        filteredPlaces[0].PlaceId, filteredPlaces[0].Name, filteredPlaces[0].Latitude, filteredPlaces[0].Longitude);
                }
                else
                {
                    _logger.LogWarning("No places within {Radius}m radius. Raw response status: {Status}", radius, result?.Status ?? "null");
                }
                
                return filteredPlaces;
            }
            catch (HttpRequestException ex) when (ex.Message.Contains("404"))
            {
                _logger.LogWarning("TrackAsia nearby search endpoint not found (404). Falling back to database search.");
                return new List<NearbyPlace>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching nearby places. URL: {Url}", $"{BaseUrl}/v2/place/nearbysearch/json");
                return new List<NearbyPlace>();
            }
        }

        public async Task<DistanceMatrixResult> CalculateDistanceMatrixAsync(
            List<(double lat, double lng)> origins,
            (double lat, double lng) destination)
        {
            try
            {
                // Sử dụng Distance Matrix v1 API
                var originsStr = string.Join("|", origins.Select(o => $"{o.lat},{o.lng}"));
                var destinationStr = $"{destination.lat},{destination.lng}";

                var url = $"{BaseUrl}/v1/distancematrix?origins={originsStr}&destinations={destinationStr}&key={_apiKey}";

                var response = await _httpClient.GetAsync(url);
                response.EnsureSuccessStatusCode();

                var content = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<TrackAsiaDistanceMatrixResponse>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                var elements = new List<DistanceElement>();
                double totalDistance = 0;
                double totalDuration = 0;
                int count = 0;

                if (result?.Rows != null)
                {
                    foreach (var row in result.Rows)
                    {
                        if (row.Elements != null)
                        {
                            foreach (var element in row.Elements)
                            {
                                if (element.Status == "OK")
                                {
                                    var distanceKm = element.Distance?.Value / 1000.0 ?? 0.0;
                                    var durationMin = element.Duration?.Value / 60 ?? 0.0;

                                    elements.Add(new DistanceElement
                                    {
                                        DistanceKm = distanceKm,
                                        DurationMinutes = (int)durationMin
                                    });

                                    totalDistance += distanceKm;
                                    totalDuration += durationMin;
                                    count++;
                                }
                            }
                        }
                    }
                }

                return new DistanceMatrixResult
                {
                    Elements = elements,
                    AverageDistanceKm = count > 0 ? totalDistance / count : 0,
                    AverageDurationMinutes = count > 0 ? (int)(totalDuration / count) : 0
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating distance matrix");
                return new DistanceMatrixResult { Elements = new List<DistanceElement>() };
            }
        }

        public async Task<ReverseGeocodeResult> ReverseGeocodeAsync(double latitude, double longitude)
        {
            try
            {
                // Sử dụng Reverse Geocoding v2 API với new_admin=true
                var url = $"{BaseUrl}/v2/geocode/reverse/json?latlng={latitude},{longitude}&new_admin=true&key={_apiKey}";

                var response = await _httpClient.GetAsync(url);
                response.EnsureSuccessStatusCode();

                var content = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<TrackAsiaReverseGeocodeResponse>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                var firstResult = result?.Results?.FirstOrDefault();
                if (firstResult == null)
                {
                    return new ReverseGeocodeResult();
                }

                return new ReverseGeocodeResult
                {
                    FormattedAddress = firstResult.FormattedAddress,
                    City = ExtractAddressComponent(firstResult.AddressComponents, "administrative_area_level_1"),
                    District = ExtractAddressComponent(firstResult.AddressComponents, "administrative_area_level_2"),
                    Ward = ExtractAddressComponent(firstResult.AddressComponents, "administrative_area_level_3")
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reverse geocoding");
                return new ReverseGeocodeResult();
            }
        }

        public async Task<PlaceDetailResult> GetPlaceDetailAsync(string placeId)
        {
            try
            {
                // Sử dụng Place Detail v2 API
                var url = $"{BaseUrl}/v2/place/details/json?place_id={placeId}&key={_apiKey}";

                var response = await _httpClient.GetAsync(url);
                response.EnsureSuccessStatusCode();

                var content = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<TrackAsiaPlaceDetailResponse>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (result?.Result == null)
                {
                    return null;
                }

                return new PlaceDetailResult
                {
                    PlaceId = result.Result.PlaceId,
                    Name = result.Result.Name,
                    FormattedAddress = result.Result.FormattedAddress,
                    Latitude = result.Result.Geometry?.Location?.Lat ?? 0.0,
                    Longitude = result.Result.Geometry?.Location?.Lng ?? 0.0,
                    Rating = result.Result.Rating,
                    PriceLevel = result.Result.PriceLevel,
                    Types = result.Result.Types,
                    PhoneNumber = result.Result.FormattedPhoneNumber,
                    Website = result.Result.Website
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting place detail");
                return null;
            }
        }

        private string ExtractAddressComponent(List<AddressComponent> components, string type)
        {
            return components?
                .FirstOrDefault(c => c.Types?.Contains(type) == true)?
                .LongName;
        }

		#region private helper

		// BaseURL and API key selection based on country code
		private string ResolveBaseUrl(string countryCode)
		{
			if (string.IsNullOrWhiteSpace(countryCode))
				return BaseUrl;

			var normalized = countryCode.Trim().ToUpper();

			return normalized switch
			{
				"VN" or "VIE" or "VIETNAM" => BaseUrl,
				"SG" or "SGP" or "SINGAPORE" => SingaporeBaseUrl,
				_ => BaseUrl
			};
		}

		private string ResolveAPIKey(string countryCode)
		{
			if (string.IsNullOrWhiteSpace(countryCode))
				return _apiKey;

			var normalized = countryCode.Trim().ToUpper();

			return normalized switch
			{
				"VN" or "VIE" or "VIETNAM" => _apiKey,
				"SG" or "SGP" or "SINGAPORE" => _singaporeApiKey,
				_ => _apiKey
			};
		}

		#endregion

		#region TrackAsia Response Models

		private class TrackAsiaNearbyResponse
        {
            [System.Text.Json.Serialization.JsonPropertyName("status")]
            public string Status { get; set; }
            
            [System.Text.Json.Serialization.JsonPropertyName("error_message")]
            public string ErrorMessage { get; set; }
            
            [System.Text.Json.Serialization.JsonPropertyName("results")]
            public List<TrackAsiaPlace> Results { get; set; }
        }

        private class TrackAsiaPlace
        {
            [System.Text.Json.Serialization.JsonPropertyName("place_id")]
            public string PlaceId { get; set; }
            
            [System.Text.Json.Serialization.JsonPropertyName("name")]
            public string Name { get; set; }
            
            [System.Text.Json.Serialization.JsonPropertyName("vicinity")]
            public string Vicinity { get; set; }
            
            [System.Text.Json.Serialization.JsonPropertyName("formatted_address")]
            public string FormattedAddress { get; set; }
            
            [System.Text.Json.Serialization.JsonPropertyName("geometry")]
            public PlaceGeometry Geometry { get; set; }
            
            [System.Text.Json.Serialization.JsonPropertyName("types")]
            public List<string> Types { get; set; }
            
            [System.Text.Json.Serialization.JsonPropertyName("rating")]
            public double? Rating { get; set; }
            
            [System.Text.Json.Serialization.JsonPropertyName("price_level")]
            public int? PriceLevel { get; set; }
            
            [System.Text.Json.Serialization.JsonPropertyName("formatted_phone_number")]
            public string FormattedPhoneNumber { get; set; }
            
            [System.Text.Json.Serialization.JsonPropertyName("website")]
            public string Website { get; set; }
        }

        private class PlaceGeometry
        {
            [System.Text.Json.Serialization.JsonPropertyName("location")]
            public Location Location { get; set; }
        }

        private class Location
        {
            [System.Text.Json.Serialization.JsonPropertyName("lat")]
            public double Lat { get; set; }
            
            [System.Text.Json.Serialization.JsonPropertyName("lng")]
            public double Lng { get; set; }
        }

        private class TrackAsiaDistanceMatrixResponse
        {
            public List<DistanceMatrixRow> Rows { get; set; }
        }

        private class DistanceMatrixRow
        {
            public List<DistanceMatrixElement> Elements { get; set; }
        }

        private class DistanceMatrixElement
        {
            public string Status { get; set; }
            public DistanceValue Distance { get; set; }
            public DistanceValue Duration { get; set; }
        }

        private class DistanceValue
        {
            public double Value { get; set; }
            public string Text { get; set; }
        }

        private class TrackAsiaReverseGeocodeResponse
        {
            public List<ReverseGeocodeResult_Internal> Results { get; set; }
        }

        private class ReverseGeocodeResult_Internal
        {
            public string FormattedAddress { get; set; }
            public List<AddressComponent> AddressComponents { get; set; }
        }

        private class AddressComponent
        {
            public string LongName { get; set; }
            public string ShortName { get; set; }
            public List<string> Types { get; set; }
        }

        private class TrackAsiaPlaceDetailResponse
        {
            public TrackAsiaPlace Result { get; set; }
        }

        #endregion
    }
}