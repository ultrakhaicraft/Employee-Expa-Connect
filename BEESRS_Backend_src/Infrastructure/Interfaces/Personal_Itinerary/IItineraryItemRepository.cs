using Domain.Entities;
using Infrastructure.Models.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.Personal_Itinerary
{
	public interface IItineraryItemRepository
	{
		Task<List<ItineraryItem>> GetAllByItineraryIdAsync(Guid itineraryId);
		Task<ItineraryItem> CreateSingleAsync(ItineraryItem itineraryItem);
		Task CreateBatchAsync(List<ItineraryItem> itineraryItems);
		Task<ItineraryItem?> GetByIdAsync(Guid itineraryItemId);
		Task UpdateAsync(ItineraryItem itineraryItem);
		Task DeleteAsync(Guid itineraryItemId);
		Task UpdateRangeAsync(IEnumerable<ItineraryItem> itineraryItems);
	}
}
