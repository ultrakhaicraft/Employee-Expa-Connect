using Domain.Entities;
using Infrastructure.Models.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IUserPreferenceRepository
    {
        Task<PagedResult<UserPreference>> GetAllUserPreference(PagedRequest request);
		Task<UserPreference> CreateAsync(UserPreference preference);
        Task<UserPreference?> GetByIdAsync(Guid preferenceId);
        Task<UserPreference?> GetByUserIdAsync(Guid userId);
        Task UpdateAsync(UserPreference preference);
        Task DeleteAsync(Guid preferenceId);
        Task<List<UserPreference>> GetByUserIdsAsync(List<Guid> userIds);
    }
}
