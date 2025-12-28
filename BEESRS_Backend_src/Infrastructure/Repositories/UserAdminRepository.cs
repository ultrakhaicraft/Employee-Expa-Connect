using Domain.Entities;
using Infrastructure.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Repositories
{
    public class UserAdminRepository : IUserAdminRepository
    {
        private readonly BEESRSDBContext _context;

        public UserAdminRepository(BEESRSDBContext context)
        {
            _context = context;
        }
        public async Task<PagedResult<User>> GetUsersPagedAsync(PagedRequest req)
        {
            var q = _context.Users
                .AsNoTracking()
                .Include(u => u.CurrentBranch)
                .Include(u => u.Role)
                .Where(u => u.RoleId != 1)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(req.Search))
            {
                var s = req.Search.Trim().ToLower();
                q = q.Where(u =>
                    u.Email.ToLower().Contains(s) ||
                    u.FirstName.ToLower().Contains(s) ||
                    u.LastName.ToLower().Contains(s) ||
                    u.EmployeeId.ToLower().Contains(s));
            }
            if (req.RoleId.HasValue)
                q = q.Where(u => u.RoleId == req.RoleId.Value);

            if (req.IsActive.HasValue)
                q = q.Where(u => u.IsActive == req.IsActive.Value);

            q = q.OrderByDescending(u => u.CreatedAt);

            var total = await q.CountAsync();
            var items = await q.Skip((req.Page - 1) * req.PageSize)
                               .Take(req.PageSize)
                               .ToListAsync();

            return new PagedResult<User>(req.Page, req.PageSize, total, items);
        }

        public async Task<User?> GetByIdAsync(Guid userId)
        {
            return await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == userId);
        }

        public async Task UpdateAsync(User user)
        {
            user.UpdatedAt = DateTimeOffset.UtcNow;
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
        }
    }
}
