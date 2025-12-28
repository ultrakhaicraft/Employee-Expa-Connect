using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace Infrastructure.Models.RouteCalculationDTO
{

	//Can be used for both route calculation and route optimization result
	public record ItineraryLegDto
	{
		public Guid FromItineraryItemId { get; set; } //Starting from / Source
		public string? DepartureName { get; set; }
		public Guid ToItineraryItemId { get; set; } //Destination
		public string? DestinationName { get; set; }
		public double? DistanceMeters { get; set; }
		public string? DistanceText { get; set; }
		public double? DurationSeconds { get; set; }
		public string? DurationText { get; set; }
		public string? TransportMethod { get; set; }
	}
	

	
	public class TrackAsiaMatrixPoint
	{
		[JsonPropertyName("hint")]
		public string? Hint { get; set; }

		[JsonPropertyName("distance")]
		public double? Distance { get; set; }

		[JsonPropertyName("name")]
		public string? Name { get; set; }

		[JsonPropertyName("location")]
		public List<double>? Location { get; set; } // [lon, lat]
	}


	#region TrackAsiaRouteResponse

	public class TrackAsiaRouteResponse
	{
		[JsonPropertyName("status")]
		public string? Status { get; set; }

		[JsonPropertyName("routes")]
		public List<Route>? Routes { get; set; }
	}

	public class Route
	{
		[JsonPropertyName("summary")]
		public string? Summary { get; set; }

		[JsonPropertyName("legs")]
		public List<Leg>? Legs { get; set; }

		[JsonPropertyName("overview_polyline")]
		public Polyline? OverviewPolyline { get; set; }
	}

	public class Leg
	{
		[JsonPropertyName("distance")]
		public DistanceInfo? Distance { get; set; }

		[JsonPropertyName("duration")]
		public DurationInfo? Duration { get; set; }

		[JsonPropertyName("start_address")]
		public string? StartAddress { get; set; }

		[JsonPropertyName("end_address")]
		public string? EndAddress { get; set; }

		[JsonPropertyName("steps")]
		public List<Step>? Steps { get; set; }
	}

	public class DistanceInfo
	{
		[JsonPropertyName("text")]
		public string? Text { get; set; }

		[JsonPropertyName("value")]
		public double? Value { get; set; }
	}

	public class DurationInfo
	{
		[JsonPropertyName("text")]
		public string? Text { get; set; }

		[JsonPropertyName("value")]
		public double? Value { get; set; }
	}

	public class Step
	{
		[JsonPropertyName("distance")]
		public DistanceInfo? Distance { get; set; }

		[JsonPropertyName("duration")]
		public DurationInfo? Duration { get; set; }

		[JsonPropertyName("html_instructions")]
		public string? HtmlInstructions { get; set; }

		[JsonPropertyName("travel_mode")]
		public string? TravelMode { get; set; }

		[JsonPropertyName("maneuver")]
		public string? Maneuver { get; set; }
	}

	public class Polyline
	{
		[JsonPropertyName("points")]
		public string? Points { get; set; }
	}

	#endregion
}
