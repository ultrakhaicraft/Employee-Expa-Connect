using Infrastructure.Models.Common;
using Infrastructure.Models.UserPreferenceDTO;
using Infrastructure.Models.UserProfileDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
	public interface IUserPreferenceService
	{
		Task<ApiResponse<PagedResult<UserPreferenceViewDto>>> GetAllUserPreferencePagedAsync(PagedRequest request);
		Task<ApiResponse<UserPreferenceDetailDto>> GetUserPreferenceDetailById(Guid preferenceId);
		Task<ApiResponse<bool>> DeleteUserPreferenceAsync(Guid preferenceId);

		Task<UserPreferenceDetailDto> GetUserPreferenceDetailByUserId(Guid userId);
		Task<UserPreferenceDetailDto> UpdateUserPreferenceAsync(UserPreferenceUpdateDto userPreferenceUpdateDto, Guid userId);
        Task<UserPreferenceDetailDto> CreateUserPreferenceAsync(UserPreferenceCreateDto request, Guid userId);
    }
}
