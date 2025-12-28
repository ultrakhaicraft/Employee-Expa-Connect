using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Application.Services.ThirdParty.MapBoxService;

namespace Application.Interfaces.ThirdParty
{
	public interface IMapBoxService
	{
		public Task<MapBoxDistanceResult?> CalculateDistanceAndDurationOfARoute(
		double originLongitude,
		double originLatitude,
		double destLongitude,
		double destLatitude,
		CancellationToken cancellationToken = default);

		public Task<List<NearbyPlace>> SearchNearbyPlacesAsync(
			double latitude, double longitude,
			int radiusMeters,
			string type = null);
	}
}
