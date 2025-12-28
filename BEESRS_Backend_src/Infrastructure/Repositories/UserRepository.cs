using Domain.Entities;
using Domain.Enums;
using Infrastructure.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly BEESRSDBContext _context;

        public UserRepository(BEESRSDBContext context)
        {
            _context = context;
        }
        public async Task<User?> GetByIdAsync(Guid userId)
        {
            return await _context.Users
                .Include(u => u.Role)
                .Include(u => u.CurrentBranch)
                .Include(u => u.UserProfile)
				.FirstOrDefaultAsync(u => u.UserId == userId);
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            return await _context.Users
                .Include(u => u.Role)
                .Include(u => u.UserProfile)
                .FirstOrDefaultAsync(u => u.Email == email);
        }

        public async Task<User?> GetByEmployeeIdAsync(string employeeId)
        {
            return await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.EmployeeId == employeeId);
        }

        public async Task<bool> EmailExistsAsync(string email)
        {
            return await _context.Users.AnyAsync(u => u.Email == email);
        }

        public async Task<bool> EmployeeIdExistsAsync(string employeeId)
        {
            return await _context.Users.AnyAsync(u => u.EmployeeId == employeeId);
        }

        public async Task<User> CreateAsync(User user)
        {
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Load related data after creation
            await _context.Entry(user)
                .Reference(u => u.Role)
                .LoadAsync();

            return user;
        }

        public async Task UpdateAsync(User user)
        {
            user.UpdatedAt = DateTimeOffset.UtcNow;
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
        }

        public async Task<User?> GetUserWithDetailsAsync(Guid userId)
        {
            return await _context.Users
                .Include(u => u.Role)
                .Include(u => u.UserProfile)
                .Include(u => u.UserPreferences)
                .Include(u => u.CurrentBranch)
                .FirstOrDefaultAsync(u => u.UserId == userId);
        }

        public IQueryable<User> GetOthersEmployeeInBranch(Guid userId, Guid branchId)
        {
            return _context.Users
                .Include(u => u.CurrentBranch)
                .Include(u => u.UserProfile)
                .Where(u => u.CurrentBranchId == branchId &&
                u.RoleId == 3 &&
                u.UserId != userId);
        }

        public async Task<List<User>> SearchUsersAsync(string query, Guid currentUserId, int maxResults = 20)
        {
            if (string.IsNullOrWhiteSpace(query))
                return new List<User>();

            // Get current user to filter by same branch
            var currentUser = await GetByIdAsync(currentUserId);
            if (currentUser == null)
                return new List<User>();

            var searchTerm = query.Trim().ToLower();

            var users = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.CurrentBranch)
                .Include(u => u.UserProfile)
                .Where(u => 
                    u.IsActive && // Only active users
                    u.UserId != currentUserId && // Exclude current user
                    u.CurrentBranchId == currentUser.CurrentBranchId && // Same branch
                    (u.Email.ToLower().Contains(searchTerm) ||
                     u.FirstName.ToLower().Contains(searchTerm) ||
                     u.LastName.ToLower().Contains(searchTerm) ||
                     (u.FirstName + " " + u.LastName).ToLower().Contains(searchTerm)))
                .OrderBy(u => u.FirstName)
                .ThenBy(u => u.LastName)
                .Take(maxResults)
                .ToListAsync();

            return users;
        }

        public async Task<Infrastructure.Models.Common.PagedResult<User>> GetUsersInBranchPagedAsync(Guid branchId, Infrastructure.Models.Common.PagedRequest req)
        {
            var query = _context.Users
                .Include(u => u.Role)
                .Include(u => u.CurrentBranch)
                .Where(u => u.CurrentBranchId == branchId && u.RoleId != (int)RoleEnum.Admin); // Exclude Admin role

            if (!string.IsNullOrEmpty(req.Search))
            {
                var searchLower = req.Search.ToLower();
                query = query.Where(u => 
                    u.FirstName.ToLower().Contains(searchLower) ||
                    u.LastName.ToLower().Contains(searchLower) ||
                    u.Email.ToLower().Contains(searchLower) ||
                    u.EmployeeId.ToLower().Contains(searchLower));
            }

            if (req.IsActive.HasValue)
            {
                query = query.Where(u => u.IsActive == req.IsActive.Value);
            }

            var totalItems = await query.CountAsync();
            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((req.Page - 1) * req.PageSize)
                .Take(req.PageSize)
                .ToListAsync();

            return new Infrastructure.Models.Common.PagedResult<User>(req.Page, req.PageSize, totalItems, users);
        }
    }
}
