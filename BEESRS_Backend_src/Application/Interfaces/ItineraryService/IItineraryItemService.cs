using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using Infrastructure.Models.ItineraryItemDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.ItineraryService
{
	public interface IItineraryItemService
	{
		Task<ApiResponse<ItineraryItemDetailDto>> AddItineraryItemAsync(Guid itineraryId, ItineraryItemCreateDto request);
		Task<ApiResponse<bool>> AddItineraryItemsBatchAsync(Guid itineraryId, List<ItineraryItemCreateDto> requests);
		Task<ApiResponse<List<ItineraryDayScheduleDto>>> GetAllItineraryItemsAsync(Guid itineraryId);
		Task<ApiResponse<bool>> DeleteItineraryItemByIdAsync(Guid itineraryId);
		Task<ApiResponse<bool>> UpdateItineraryItemAsync(Guid itineraryId, ItineraryItemUpdateDto request);
		Task<ApiResponse<bool>> ReorderItineraryItemsAsync(Guid itineraryId, List<ItineraryItemReorderDto> reorderedItems);
	}
}
