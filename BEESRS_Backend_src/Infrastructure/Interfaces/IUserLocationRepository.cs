using Domain.Entities;
using Infrastructure.Models.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
	public interface IUserLocationRepository
	{
		Task<UserLocation> CreateAsync(UserLocation userLocation);
		Task<UserLocation?> GetByIdAsync(Guid userLocationId);
		Task UpdateAsync(UserLocation userLocation);
		Task DeleteAsync(Guid userLocationId);
		Task<PagedResult<UserLocation>> GetAllUserLocation(PagedRequest request);
		Task<List<UserLocation>> GetByUserIdsAsync(List<Guid> userIds);
	}
}
