using Domain.Entities;
using Infrastructure.Models.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.Personal_Itinerary
{
	public interface IItineraryShareRepository
	{
		Task<ItineraryShare> CreateSingleAsync(ItineraryShare itineraryShare);
		Task<PagedResult<ItineraryShare>> GetPagedCreatedByUser(PagedRequest request, Guid UserId);
		Task<ItineraryShare?> GetByIdAsync(Guid itineraryShareId);
		Task UpdateAsync(ItineraryShare itineraryShare);
		Task DeleteAsync(ItineraryShare itineraryShare);
		Task <ItineraryShare?> GetShareByItineraryIdAndUserIdAsync(Guid itineraryId, Guid userId);
		Task<IEnumerable<ItineraryShare>> GetSharesByItineraryIdAsync(Guid itineraryId);
		Task<IEnumerable<ItineraryShare>> GetSharedWithUserAsync(Guid userId);

	}
}
