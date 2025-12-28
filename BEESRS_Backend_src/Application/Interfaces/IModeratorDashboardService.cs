using Infrastructure.Models.Common;
using Infrastructure.Models.UserDTO;
using System;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IModeratorDashboardService
    {
        Task<PagedResult<UserListItemDto>> GetUsersInBranchAsync(Guid moderatorId, PagedRequest req);
        Task<bool> ToggleUserStatusAsync(Guid moderatorId, Guid userId);
        Task<UserInfoDto> GetUserDetailsAsync(Guid moderatorId, Guid userId);
        Task<ModeratorAnalyticsDto> GetAnalyticsAsync(Guid moderatorId);
    }
}
