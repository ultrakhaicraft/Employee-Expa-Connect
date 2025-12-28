using Domain.Entities;
using Infrastructure.Models.AdminManageModel;
using Infrastructure.Models.Common;
using Infrastructure.Models.Moderator;
using Infrastructure.Models.PlaceDTO;
using Infrastructure.Models.UserDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
	public interface IPlaceService
	{
		Task<PagedResult<PlaceListItemDto>> GetAllAsync(OnlyPageRequest req);
		Task<PlaceDetail> GetPlaceByIdAsync(Guid placeId, Guid userId);
        Task<List<PlaceImageDto>> GetImagesByPlaceIdAsync(Guid placeId);
		Task<PlaceDetailForHome> CreatePlaceAsync(CreatePlaceDto createPlaceDto, Guid userId);
		Task<int> DeletePlaceAsync(Guid placeId, Guid userId);
		Task<IEnumerable<PlaceList>> GetByBoundingBoxAsync(PlaceBoundingBoxSearchFilter filter);
		Task UpdatePlaceAsync(UpdatePlaceDTO updatePlaceDTO, Guid userId);
		Task<PagedResult<PlaceListItemDto>> SearchPlacesByNameOrAddressAsync(string? name, double userLat, double userLng, int page, int pageSize);
        Task<PagedResult<PlaceListItemDto>> GetAllCreatedPlaceAsync(Guid userId, OnlyPageRequest req);
        Task<PagedResult<PlaceWithReviews>> GetAllCreatedPlaceOfAsync(Guid userId, OnlyPageRequestWithUserId req);

        Task<List<PlaceCategory>> GetAllPlaceCategory();

        Task<int> AddImagesToPlace(AddPlaceImage addPlaceImage, Guid userId);
		Task<int> RemoveImage(Guid userId, Guid imageId);

		Task<PagedResult<PlaceDetailForHome>> GetAllPendingPlaceAsync(Guid moderatorId, OnlyPageRequest req);
		Task<int> VerifyPlaceAsync(Guid moderatorId, UpdatePlaceStatus updatePlaceStatus);
		Task<PagedResult<PlaceWithReviews>> GetAllPlaceByBranchIdAsync(Guid userId, OnlyPageRequest req);

        Task LikePlaceAsync(Guid userId, Guid placeId);
        Task DislikePlaceAsync(Guid userId, Guid placeId);
        Task<PagedResult<PlaceWithReviews>> GetAllLikedPlaces(Guid userId, OnlyPageRequest req);
        Task<PagedResult<PlaceWithReviews>> GetPlacesForHome(Guid userId, PageRequestWithLocation req);
        Task<PlaceDetailDto> GetPlaceByGooglePlaceIdAsync(string googlePlaceId);

		Task<List<PlaceTagDTO>> GetTagsOfPlace(Guid placeId);
    }
}
