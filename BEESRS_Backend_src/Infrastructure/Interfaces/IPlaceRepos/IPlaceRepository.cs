using Domain.Entities;
using Domain.Enums;
using Infrastructure.Models.Common;
using Infrastructure.Models.PlaceDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.IPlaceRepos
{
	public interface IPlaceRepository
	{
		Task<Place> GetByIdAsync(Guid placeId, Guid userId);
		IQueryable<Place> GetAllPlace();
		Task<int> UpdateAsync(Place place);
		Task<int> DeleteAsync(Guid placeId);
		Task<List<PlaceImage>> GetImagesByPlaceIdAsync(Guid placeId);
		Task<Place> CreatePlaceAsync(Place place);
		Task<IEnumerable<Place>> GetByBoundingBoxAsync(PlaceBoundingBoxSearchFilter filter);
        IQueryable<Place> SearchPlacesByNameOrAdrress(string name);
		IQueryable<Place> SearchPlacesNearBy(string? name, double userLat, double userLng);

        IQueryable<Place> GetAllCreatedPlace(Guid userId);
        IQueryable<Place> GetAllCreatedPlaceOf(Guid userId, Guid ownerId);
        Task<List<PlaceCategory>> GetAllPlaceCategory();
        Task<IQueryable<Place>> GetAllPendingPlaceAsync(Guid branchId);
        Task<int> VerifyPlaceAsync(Guid placeId, PlaceVerificationStatus status, string? notes);
		Task UpdateAverage(Guid placeId);
		IQueryable<Place> GetAllPlaceByBranchId(Guid branchId, Guid userId);
		Task AddLikeToPlace(Guid placeId);
		Task DeleteLikeToPlace(Guid placeId);
        Task LikePlaceAsync(Guid userId, Guid placeId);
		Task DislikePlaceAsync(Guid userId, Guid placeId);
        IQueryable<Place> GetAllLikedPlaces(Guid userId);
		IQueryable<Place> GetPlacesForHome(Guid? branchId, int? categoryId);
		Task<List<Place>> GetPlacesByIdsWithDetailsAsync(List<Guid> placeIds, Guid userId);
        Task<Place> GetByGooglePlaceIdAsync(string googlePlaceId);
    }
}
