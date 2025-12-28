using Domain.Entities;
using Infrastructure.Helper;
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
    public class UserPreferenceRepository : IUserPreferenceRepository
    {
        private readonly BEESRSDBContext _context;

        public UserPreferenceRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<UserPreference> CreateAsync(UserPreference preference)
        {
            preference.CreatedAt = DateTimeOffset.UtcNow;
            _context.UserPreferences.Add(preference);
            await _context.SaveChangesAsync();
            return preference;
        }

        public async Task<UserPreference?> GetByIdAsync(Guid preferenceId)
        {
            return await _context.UserPreferences
                .FirstOrDefaultAsync(p => p.PreferenceId == preferenceId);
        }

        public async Task<UserPreference?> GetByUserIdAsync(Guid userId)
        {
            return await _context.UserPreferences.FirstOrDefaultAsync(up => up.UserId == userId);
        }

        public async Task UpdateAsync(UserPreference preference)
        {
            preference.UpdatedAt = DateTimeOffset.UtcNow;
            _context.UserPreferences.Update(preference);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid preferenceId)
        {
            var preference = await _context.UserPreferences.FindAsync(preferenceId);
            if (preference != null)
            {
                _context.UserPreferences.Remove(preference);
                await _context.SaveChangesAsync();
            }
        }

		/// <summary>
		/// Get all user preference, no search
		/// </summary>
		/// <param name="request"></param>
		/// <returns></returns>
		/// <exception cref="NotImplementedException"></exception>
		public async Task<PagedResult<UserPreference>> GetAllUserPreference(PagedRequest request)
		{
			var list = _context.UserPreferences
				.AsNoTracking()
				.AsQueryable();

			list = list.OrderByDescending(p => p.CreatedAt);


			var pagedResult = await PageConverter<UserPreference>.ToPagedResultAsync(
				request.Page, request.PageSize, await list.CountAsync(), list);

			return pagedResult;
		}

        public async Task<List<UserPreference>> GetByUserIdsAsync(List<Guid> userIds)
        {
            return await _context.UserPreferences
                .Where(up => userIds.Contains(up.UserId))
                .ToListAsync();
        }
	}
}
