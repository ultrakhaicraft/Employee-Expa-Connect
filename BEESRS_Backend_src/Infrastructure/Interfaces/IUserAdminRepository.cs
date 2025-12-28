using Domain.Entities;
using Infrastructure.Models.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IUserAdminRepository
    {
        Task<PagedResult<User>> GetUsersPagedAsync(PagedRequest req);
        Task<User?> GetByIdAsync(Guid userId);
        Task UpdateAsync(User user);
    }
}
