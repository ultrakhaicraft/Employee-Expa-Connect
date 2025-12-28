using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace Infrastructure.Models.RouteCalculationDTO
{
	public class RouteOptimizationResponse {
		public bool Success { get; set; } 
		public string? Code { get; set; } 
		public string? Error { get; set; } 
		public List<Guid> UnassignedJobIds { get; set; } = new(); 
		public List<ItineraryLegDto> ReorderedItems { get; set; } = new(); 
		public double? TotalDistance { get; set; }
		public string? TotalDistanceText { get; set; }
		public double? TotalDuration { get; set; } 
		public string? TotalDurationText { get; set; }
	}

	#region TrackAsia Route Optimize Request
	//Request to the vehicle optimization API
	public class VrpRequest
	{
		[JsonPropertyName("vehicles")]
		public required List<Vehicle> Vehicles { get; set; }
		[JsonPropertyName("jobs")]
		public required List<Job> Jobs { get; set; }

		[JsonPropertyName("options")]
		public OptimizationOption? Options { get; set; }
	}

	public class OptimizationOption
	{
		[JsonPropertyName("g")]
		public bool EnableReturnGeometry { get; set; } = false; //Return geometry
	}

	//Detail the vehicle/transport method used in the calculation
	public class Vehicle
	{
		[JsonPropertyName("id")]
		public required int Id { get; set; }
		[JsonPropertyName("profile")]
		public string Profile { get; set; } = "car";
		[JsonPropertyName("description")]
		public string? Description { get; set; }
		[JsonPropertyName("start")]
		public required double[] Start { get; set; }
		[JsonPropertyName("end")]
		public double[]? End { get; set; }

		[JsonPropertyName("start_description")]
		public string? StartDescription { get; set; }
		[JsonPropertyName("end_description")]
		public string? EndDescription { get; set; }

	}

	//Define the location/place of interest need to go
	public class Job
	{
		[JsonPropertyName("id")]
		public required int Id { get; set; }
		[JsonPropertyName("description")]
		public string Description { get; set; } = string.Empty;
		[JsonPropertyName("location")]
		public required double[] Location { get; set; }

		[JsonPropertyName("service")]
		public int Service { get; set; } = 0;

		[JsonPropertyName("setup")]
		public int Setup { get; set; } = 0;

		[JsonPropertyName("skills")]
		public List<int>? Skills { get; set; } = new();

		[JsonPropertyName("priority")]
		public int Priority { get; set; } = 1;
	}
	#endregion

	#region TrackAsia Route Optimize Response

	public class VrpResponse
	{
		[JsonPropertyName("code")]
		public int Code { get; set; }

		[JsonPropertyName("error")]
		public string? Error { get; set; }

		[JsonPropertyName("summary")]
		public Summary? Summary { get; set; }

		[JsonPropertyName("unassigned")]
		public List<UnassignedJob> Unassigned { get; set; } = new();

		[JsonPropertyName("routes")]
		public List<OptimizedRoute> Routes { get; set; } = new();
	}

	public class Summary
	{
		public double Cost { get; set; }
		public int Routes { get; set; }
		public int Unassigned { get; set; }
		public List<int> Delivery { get; set; } = new();
		public List<int> Amount { get; set; } = new();
		public List<int> Pickup { get; set; } = new();
		public double Setup { get; set; }
		public double Service { get; set; }
		public double Duration { get; set; }
		public double Waiting_Time { get; set; }
		public double Priority { get; set; }
		public double Distance { get; set; }
		public List<object> Violations { get; set; } = new();
		
	}

	public class UnassignedJob
	{
		[JsonPropertyName("id")]
		public string? Id { get; set; }
		[JsonPropertyName("type")]
		public string? Type { get; set; }
		public double[]? Location { get; set; }
		public string? Description { get; set; }

	}

	public class OptimizedRoute
	{
		[JsonPropertyName("vehicle")]
		public int Vehicle { get; set; }

		[JsonPropertyName("steps")]
		public List<RouteStep> Steps { get; set; } = new();

		[JsonPropertyName("description")]
		public string? Description { get; set; }

		[JsonPropertyName("duration")]
		public double? Duration { get; set; }

		[JsonPropertyName("distance")]
		public double? Distance { get; set; }
	}

	public class RouteStep
	{
		[JsonPropertyName("type")]
		public string? Type { get; set; } // "start", "job", "end"
		[JsonPropertyName("description")]
		public string Description { get; set; } = string.Empty; // Itinerary Item Id

		[JsonPropertyName("id")]
		public int? Id { get; set; }

		[JsonPropertyName("location")]
		public double[]? Location { get; set; }

		[JsonPropertyName("arrival")]
		public double? Arrival { get; set; }

		[JsonPropertyName("duration")]
		public double? Duration { get; set; }

		[JsonPropertyName("distance")]
		public double? Distance { get; set; }
	}


	#endregion



}
