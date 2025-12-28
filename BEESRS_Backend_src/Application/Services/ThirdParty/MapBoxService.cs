using Application.Interfaces.ThirdParty;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace Application.Services.ThirdParty
{
	public class MapBoxService : IMapBoxService
	{
		private readonly HttpClient _httpClient;
		private readonly string _apiKey;
		private const string BaseUrl = "https://api.mapbox.com";
		private readonly ILogger<MapBoxService> _logger;

		public MapBoxService(System.Net.Http.IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<MapBoxService> logger)
		{
			_httpClient = httpClientFactory.CreateClient(nameof(MapBoxService));
			_apiKey = configuration["Mapbox:AccessToken"];
			_logger = logger;
		}

		/// <summary>
		/// Calculate the distance and duration of a route, by definition a origin place and a destination place.
		/// </summary>
		/// <param name="originLongitude"></param>
		/// <param name="originLatitude"></param>
		/// <param name="destLongitude"></param>
		/// <param name="destLatitude"></param>
		/// <param name="cancellationToken"></param>
		/// <returns></returns>
		public async Task<MapBoxDistanceResult?> CalculateDistanceAndDurationOfARoute(
		double originLongitude, double originLatitude,
		double destLongitude, double destLatitude,
		CancellationToken cancellationToken = default)
		{
			try
			{
				
				var coordinates = $"{originLongitude},{originLatitude};{destLongitude},{destLatitude}";
				var profile = "driving"; //Can be driving, walking, cycling

				var url =
					$"{BaseUrl}/directions/v5/mapbox/{profile}/{coordinates}" +
					$"?geometries=geojson&access_token={_apiKey}";

				var response = await _httpClient.GetAsync(url, cancellationToken);

				if (!response.IsSuccessStatusCode)
				{
					_logger.LogWarning("MapBox API returned {StatusCode}", response.StatusCode);
					return null;
				}

				var data = await response.Content.ReadFromJsonAsync<MapBoxDirectionsResponse>(cancellationToken: cancellationToken);

				if (data?.Routes == null || !data.Routes.Any())
				{
					_logger.LogWarning("MapBox response contains no routes.");
					return null;
				}

				var route = data.Routes.First();

				return new MapBoxDistanceResult
				{
					DistanceMeters = route.Distance,
					DurationSeconds = route.Duration
				};
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error calling MapBox Directions API");
				return null;
			}
		}

		public async Task<List<NearbyPlace>> SearchNearbyPlacesAsync(
			double latitude, double longitude,
			int radiusMeters,
			string type = null)
		{
			try
			{
				//Create empty search query if type is null or empty
				string query = string.IsNullOrEmpty(type) ? "" : type;

				//Coordinates
				string coords = $"{longitude},{latitude}";

				//limit = approximate based on radius
				
				int limit = 20;

				var url =
					$"{BaseUrl}/geocoding/v5/mapbox.places/{Uri.EscapeDataString(query)}.json" +
					$"?proximity={coords}" +
					$"&types=poi" +
					$"&limit={limit}" +
					$"&access_token={_apiKey}";

				var response = await _httpClient.GetAsync(url);

				if (!response.IsSuccessStatusCode)
				{
					_logger.LogInformation("Mapbox Nearby Search failed with status: {StatusCode}", response.StatusCode);
					return new List<NearbyPlace>();
				}

				var content = await response.Content.ReadAsStringAsync();
				var json = JsonSerializer.Deserialize<MapboxGeocodingResponse>(content,
					new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

				if (json?.Features == null)
					return new List<NearbyPlace>();

				var result = new List<NearbyPlace>();

				foreach (var feature in json.Features)
				{
					if (feature.Geometry?.Coordinates == null || feature.Geometry.Coordinates.Count < 2)
						continue;

					double placeLon = feature.Geometry.Coordinates[0];
					double placeLat = feature.Geometry.Coordinates[1];

					//simulate radius filter manually using Haversine
					double distanceMeters = CalculateHaversineDistance(latitude, longitude, placeLat, placeLon);
					if (distanceMeters > radiusMeters)
						continue;

					result.Add(new NearbyPlace
					{
						PlaceId = feature.Id,
						Name = feature.Text,
						Address = feature.Properties?["address"]?.ToString() ?? feature.PlaceName,
						Latitude = placeLat,
						Longitude = placeLon,
						Type = type ?? "poi",
						Rating = null,      //Mapbox does not provide ratings
						PriceLevel = null   //Mapbox does not provide price levels
					});
				}

				return result;
			}
			catch (Exception ex)
			{
				_logger.LogInformation(ex, "Error searching nearby places (Mapbox)");
				return new List<NearbyPlace>();
			}
		}

		private double CalculateHaversineDistance(
			double lat1, double lon1,
			double lat2, double lon2)
		{
			double R = 6371000; // meters
			double dLat = (lat2 - lat1) * Math.PI / 180;
			double dLon = (lon2 - lon1) * Math.PI / 180;

			double a =
				Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
				Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
				Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

			double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
			return R * c;
		}


		//Temporarily placing DTOs for conveinience. Move to separate files later. (if you can't read this, it's your problem)
		#region ResponseDTO
		public class MapBoxDistanceResult
		{
			public double DistanceMeters { get; set; }
			public double DurationSeconds { get; set; }
		}

		public class MapBoxDirectionsResponse
		{
			[JsonPropertyName("code")]
			public string Code { get; set; } = string.Empty;
			[JsonPropertyName("routes")]
			public List<Route>? Routes { get; set; }
			[JsonPropertyName("uuid")]
			public string Uuid { get; set; } = string.Empty;
		}

		public class Route
		{
			[JsonPropertyName("distance")]
			public double Distance { get; set; }   // meters
			[JsonPropertyName("duration")]
			public double Duration { get; set; }   // seconds

		}

		public class MapboxGeocodingResponse
		{
			public List<MapboxFeature> Features { get; set; }
		}

		public class MapboxFeature
		{
			public string Id { get; set; }
			public string Text { get; set; }
			public string PlaceName { get; set; }
			public MapboxGeometry Geometry { get; set; }
			public Dictionary<string, object> Properties { get; set; }
		}

		public class MapboxGeometry
		{
			public List<double> Coordinates { get; set; }
		}


		#endregion
	}
}
