using Domain.Entities;
using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.ItineraryService
{
	public interface IItineraryTemplateService
	{
		Task<ApiResponse<PagedResult<ItineraryTemplateDto>>> GetPublicTemplatesAsync(ItineraryPagedRequest request);
		Task<ApiResponse<PagedResult<ItineraryTemplateDto>>> GetMyTemplatesAsync(ItineraryPagedRequest request, Guid userId);
		Task<ApiResponse<Guid>> ConvertToTemplateAsync(Guid itineraryId, string? category = null);

	}
}
