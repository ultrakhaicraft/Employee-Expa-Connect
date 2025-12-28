using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(Guid userId);
        Task<User?> GetByEmailAsync(string email);
        Task<User?> GetByEmployeeIdAsync(string employeeId);
        Task<bool> EmailExistsAsync(string email);
        Task<bool> EmployeeIdExistsAsync(string employeeId);
        Task<User> CreateAsync(User user);
        Task UpdateAsync(User user);
        Task<User?> GetUserWithDetailsAsync(Guid userId);
        IQueryable<User> GetOthersEmployeeInBranch(Guid userId, Guid branchId);
        Task<List<User>> SearchUsersAsync(string query, Guid currentUserId, int maxResults = 20);
        Task<Infrastructure.Models.Common.PagedResult<User>> GetUsersInBranchPagedAsync(Guid branchId, Infrastructure.Models.Common.PagedRequest req);
    }
}
