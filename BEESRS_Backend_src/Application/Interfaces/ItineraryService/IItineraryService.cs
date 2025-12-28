using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using Infrastructure.Models.ItineraryItemDTO;
using Infrastructure.Models.ItineraryShareDTO;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.ItineraryService
{
	public interface IItineraryService
	{
		Task<ApiResponse<PagedResult<ItineraryViewDto>>> GetAllPagedByUserAsync(ItineraryPagedRequest request, Guid userId);
		Task<ApiResponse<Guid>> CreateAsTemplateAsync(ItineraryCreateAsTemplateDto request, Guid userId);
		Task<ApiResponse<Guid>> CreateNewAsync(ItineraryCreateNewDto request, Guid userId);
		Task<ApiResponse<ItineraryDetailDto>> GetItineraryDetailByIdAsync(Guid itineraryId);
		Task<ApiResponse<bool>> UpdateItineraryAsync(Guid itineraryId, ItineraryUpdateDto request, Guid senderId);
		Task<ApiResponse<bool>> DeleteItineraryByIdAsync(Guid itineraryId, Guid senderId);
		Task<ApiResponse<bool>> SaveAsTemplate(Guid exisitingItineraryId);
		Task<ApiResponse<Guid>> DuplicateItineraryAsync(Guid userId, Guid ExistingItineraryId);
		Task<ApiResponse<PagedResult<ItineraryViewDto>>> SearchAllPagedByUserId(ItineraryPagedRequest request, Guid userId);		
		Task<ApiResponse<UploadResultDto>> AddImageAsync(Guid itineraryId, IFormFile imageFile, Guid senderId);
		Task<ApiResponse<string>> CheckItineraryOwner(Guid itineraryId, Guid userId);
		Task<ApiResponse<string>> CheckItineraryOwnerByItineraryItem(Guid itineraryItemId, Guid userId);
	}
}
