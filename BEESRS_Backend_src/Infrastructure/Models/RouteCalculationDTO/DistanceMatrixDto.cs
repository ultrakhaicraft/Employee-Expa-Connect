using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace Infrastructure.Models.RouteCalculationDTO
{
	

	public class TrackAsiaDistanceMatrixResponse
	{
		[JsonPropertyName("code")]
		public string? Code { get; set; }

		[JsonPropertyName("distances")]
		public List<List<double>>? Distances { get; set; }

		[JsonPropertyName("durations")]
		public List<List<double>>? Durations { get; set; }

		[JsonPropertyName("sources")]
		public List<TrackAsiaMatrixPoint>? Sources { get; set; }

		[JsonPropertyName("destinations")]
		public List<TrackAsiaMatrixPoint>? Destinations { get; set; }
	}
}
