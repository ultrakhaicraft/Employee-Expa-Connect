using Infrastructure.Models.Common;
using Infrastructure.Models.UserDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IAdminUserService
    {
        Task<Infrastructure.Models.Common.PagedResult<UserListItemDto>> GetUsersAsync(PagedRequest req);
        Task<bool> PromoteUserToModeratorAsync(Guid userId); // 3 -> 2
    }
}
