using Domain.Enums;
using Infrastructure.Models.RouteCalculationDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Helper
{
	public class RouteCalculationHelper
	{

		public string ConvertTransportMethodToRightData(string input)
		{
			if (!Enum.TryParse<TransportMethod>(input, true, out var method))
				return "none";

			switch (input)
			{
				case nameof(Domain.Enums.TransportMethod.Walking): return "walk";
				case nameof(Domain.Enums.TransportMethod.Motorcycling): return "moto";
				case nameof(Domain.Enums.TransportMethod.Driving): return "car";
				case nameof(Domain.Enums.TransportMethod.Truck): return "truck";
				default: return "none";
			}
		}




		public string FormatDistance(double meters)
		{
			if (meters <= 0)
				return "0 meters";

			if (meters < 1000)
			{
				return $"{Math.Round(meters)} meters";
			}
			else
			{
				double km = meters / 1000.0;
				// Round to one decimal place if needed
				return km % 1 == 0
					? $"{km:N0} km"
					: $"{km:F1} km";
			}
		}

		public string FormatDuration(double seconds)
		{
			if (seconds <= 0)
				return "0 seconds";

			if (seconds < 60)
				return $"{Math.Round(seconds)} seconds";

			int totalMinutes = (int)Math.Floor(seconds / 60);
			int hours = totalMinutes / 60;
			int minutes = totalMinutes % 60;
			int secs = (int)Math.Round(seconds % 60);

			List<string> parts = new();

			if (hours > 0)
				parts.Add($"{hours} hour{(hours > 1 ? "s" : "")}");
			if (minutes > 0)
				parts.Add($"{minutes} minute{(minutes > 1 ? "s" : "")}");
			if (secs > 0 && hours == 0) // usually skip seconds if over an hour
				parts.Add($"{secs} second{(secs > 1 ? "s" : "")}");

			return string.Join(" ", parts);
		}

		public double GetTotalDuration(List<ItineraryLegDto> legs)
		{
			if (legs == null || legs.Count == 0)
				return 0;

			// Sum all non-null DurationSeconds
			double total = legs.Sum(l => l.DurationSeconds ?? 0);

			return total;
		}

		public double GetTotalDistance(List<ItineraryLegDto> legs)
		{
			if (legs == null || legs.Count == 0)
				return 0;
			// Sum all non-null DistanceMeters
			double total = legs.Sum(l => l.DistanceMeters ?? 0);
			return total;
		}
	}
}
