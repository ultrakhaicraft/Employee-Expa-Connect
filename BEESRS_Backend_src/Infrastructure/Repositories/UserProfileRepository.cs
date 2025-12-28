using AutoMapper;
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
    public class UserProfileRepository : IUserProfileRepository
    {
        private readonly BEESRSDBContext _context;

        public UserProfileRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<UserProfile> CreateAsync(UserProfile profile)
        {
            _context.UserProfiles.Add(profile);
            await _context.SaveChangesAsync();
            return profile;
        }

        public async Task<UserProfile?> GetByUserIdAsync(Guid userId)
        {
            return await _context.UserProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);
        }

        public async Task UpdateAsync(UserProfile profile)
        {
            profile.UpdatedAt = DateTimeOffset.UtcNow;
            _context.UserProfiles.Update(profile);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid profileId)
        {
            var profile = await _context.UserProfiles.FindAsync(profileId);
            if (profile != null)
            {
                _context.UserProfiles.Remove(profile);
                await _context.SaveChangesAsync();
            }
        }

		// Add or update user avatar URL based on userId
		public async Task AddUserAvatar(Guid userId, string avatarUrl)
		{
			var profile = await GetByUserIdAsync(userId);
			if (profile != null)
			{
				profile.ProfilePictureUrl = avatarUrl;
                profile.UpdatedAt = DateTimeOffset.UtcNow;
                _context.UserProfiles.Update(profile);
				await _context.SaveChangesAsync();
			} else
            {
                throw new Exception("Profile not found while adding user avatar");
			}
		}

        /// <summary>
        /// Get all user profile, no search
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
        /// <exception cref="NotImplementedException"></exception>
		public async Task<PagedResult<UserProfile>> GetAllUserProfile(PagedRequest request)
		{
			var list = _context.UserProfiles
				.AsNoTracking()
				.AsQueryable();

			list = list.OrderByDescending(p => p.CreatedAt);


			var pagedResult = await PageConverter<UserProfile>.ToPagedResultAsync(
				request.Page, request.PageSize, await list.CountAsync(), list);

			return pagedResult;
		}

		public async Task<string> GetUserAvatarUrlByUserId(Guid userId)
		{
			var profile = await GetByUserIdAsync(userId);
			if (profile != null)
			{
				return profile.ProfilePictureUrl ?? string.Empty;
			}
			else
			{
				throw new Exception("Profile not found while getting user avatar");
			}
		}

		public async Task<UserProfile?> GetByIdAsync(Guid profileId)
		{
			return await _context.UserProfiles
                .Include(p => p.User)
                .Include(p => p.User)
                    .ThenInclude(u => u.CurrentBranch)
                .FirstOrDefaultAsync(p => p.ProfileId == profileId);
		}
	}
}
