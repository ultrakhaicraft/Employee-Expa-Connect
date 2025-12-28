using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.IPlaceRepos
{
    public interface ISavedPlaceRepository
    {
        Task AddToSavedPlacesAsync(Guid userId, Guid placeId);
        Task RemoveFromSavedPlacesAsync(Guid userId, Guid placeId);
        Task<IQueryable<Place>> GetSavedPlaceIdsByUserIdAsync(Guid userId);
    }
}
