using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryStatisticsDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.ItineraryService
{
	public interface IItineraryStatisticService
	{
		Task<ApiResponse<UserItineraryStatDto>> GetUserItineraryStatisticsAsync(Guid userId);
		Task<ApiResponse<ItineraryStatDto>> GetItineraryStatisticsAsync(Guid itineraryId);

	}
}
