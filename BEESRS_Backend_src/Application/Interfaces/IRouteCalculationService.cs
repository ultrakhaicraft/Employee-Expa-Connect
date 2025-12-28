using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using Infrastructure.Models.RouteCalculationDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
	public interface IRouteCalculationService
	{
		Task<ApiResponse<List<ItineraryLegDto>>> CalculateEachLegFromItinerary(Guid ItineraryId, string profile);
		Task<ApiResponse<List<ItineraryLegDto>>> CalculateRoutesFromItinerary(Guid ItineraryId);
		Task<ApiResponse<RouteOptimizationResponse>> OptimizeRouteFromItinerary(Guid itineraryId);

	}
}
