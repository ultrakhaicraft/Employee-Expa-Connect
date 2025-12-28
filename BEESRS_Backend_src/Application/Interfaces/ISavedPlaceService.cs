using Infrastructure.Models.Common;
using Infrastructure.Models.PlaceDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface ISavedPlaceService
    {
        Task SavePlaceAsync(Guid userId, Guid placeId);
        Task RemoveSavedPlaceAsync(Guid userId, Guid placeId);
        Task<PagedResult<PlaceWithReviews>> GetSavedPlacesByUserIdAsync(Guid userId, OnlyPageRequest req);
    }
}
