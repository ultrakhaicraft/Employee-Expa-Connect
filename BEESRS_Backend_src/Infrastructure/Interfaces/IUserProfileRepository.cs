using AutoMapper;
using Domain.Entities;
using Infrastructure.Models.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IUserProfileRepository
    {
        Task<UserProfile> CreateAsync(UserProfile profile);
        Task<UserProfile?> GetByIdAsync(Guid profileId);
		Task<UserProfile?> GetByUserIdAsync(Guid userId);
		Task<PagedResult<UserProfile>> GetAllUserProfile(PagedRequest request);
        Task<string> GetUserAvatarUrlByUserId(Guid userId);
        Task UpdateAsync(UserProfile profile);
		Task DeleteAsync(Guid profileId);
        Task AddUserAvatar(Guid profileId, string avatarUrl);
	}
}
