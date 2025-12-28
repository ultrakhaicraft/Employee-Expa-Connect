using Domain.Entities;
using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.Personal_Itinerary
{
	public interface IItineraryRepository
	{
		Task<PagedResult<Itinerary>> GetPagedByUserIdAsync(ItineraryPagedRequest request, Guid userId);
		Task<PagedResult<Itinerary>> SearchAllItineraryByUserId(ItineraryPagedRequest request, Guid userId);
		Task<PagedResult<Itinerary>> SearchAllItinerary(ItineraryPagedRequest request);
		Task<Itinerary> CreateAsync(Itinerary itinerary);
		Task<Itinerary?> GetByIdAsync(Guid itineraryId);
		Task<bool> UpdateAsync(Itinerary itinerary);
		Task<bool> DeleteAsync(Guid itineraryId);
		Task<string> GetItineraryImageUrlByItineraryId(Guid itineraryId);
		Task AddItineraryImage(Guid itineraryId, string itineraryImageUrl);
	}
}
