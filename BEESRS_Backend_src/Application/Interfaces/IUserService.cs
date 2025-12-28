using Infrastructure.Models.Common;
using Infrastructure.Models.UserDTO;
using Infrastructure.Models.UserProfileDTO;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
	public interface IUserService
	{
		Task<ApiResponse<UploadResultDto>> AddUserAvatarAsync(Guid profileId, IFormFile imageFile);
		Task<ApiResponse<PagedResult<UserProfileViewDto>>> GetAllUserProfilesPagedAsync(PagedRequest request, Guid currentUserId);
		Task<ApiResponse<UserInfoDto>> GetOtherUserProfileDetailByUserId(Guid otherUserId, Guid currentUserId);
		Task<ApiResponse<Guid>> CreateUserProfileAsync(UserProfileCreateDto request);
		Task<ApiResponse<bool>> UpdateUserProfileAsync(UserProfileUpdateDto request, Guid userProfileId);
		Task<ApiResponse<bool>> DeleteUserProfileAsync(Guid profileId);
		Task<ApiResponse<UserInfoDto>> GetCurrentUserAsync(Guid userId);
		Task<ApiResponse<bool>> UpdateUserAndUserProfileAsync(UserAndUserProfileUpdateDto request, Guid userId);
		Task<ApiResponse<List<UserSearchResultDto>>> SearchUsersAsync(string query, Guid currentUserId);
	}
}
