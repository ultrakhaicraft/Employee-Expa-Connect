using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryShareDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.ItineraryService
{
	public interface IItineraryShareService
	{
		Task<ApiResponse<ItineraryShareDetailDto>> ShareItineraryAsync(ItineraryShareCreateDto request,Guid itineraryId, Guid CurrentUserId);
		Task<ApiResponse<bool>> RevokeShareItineraryAsync(Guid shareId, Guid userId);
		Task<ApiResponse<List<ItineraryShareDetailDto>>> GetSharesByItineraryIdAsync(Guid itineraryId);
		Task<ApiResponse<List<ItineraryShareViewDto>>> GetSharedWithMeAsync(Guid userId);
	
	}
}
