using Infrastructure.Models.Common;
using Infrastructure.Models.UserLocationDTO;
using Infrastructure.Models.UserPreferenceDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
	public interface IUserLocationService
	{
		Task<ApiResponse<PagedResult<UserLocationViewDto>>> GetAllUserLocationPagedAsync(PagedRequest request);
		Task<ApiResponse<UserLocationDetailDto>> GetUserLocationDetailById(Guid userLocationId);
		Task<ApiResponse<Guid>> CreateUserLocationAsync(UserLocationCreateDto request);
		Task<ApiResponse<bool>> UpdateUserLocationAsync(UserLocationUpdateDto request, Guid userLocationId);
		Task<ApiResponse<bool>> DeleteUserLocationAsync(Guid userLocationId);
	}
}
