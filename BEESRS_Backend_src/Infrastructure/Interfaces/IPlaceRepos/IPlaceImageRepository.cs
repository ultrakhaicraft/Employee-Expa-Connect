using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.IPlaceRepos
{
	public interface IPlaceImageRepository
	{
		Task<PlaceImage> AddAsync(PlaceImage place);
		Task AddInBatchAsync(List<PlaceImage> images);
		Task RemoveInBatchAsync(List<PlaceImage> images);
        Task<PlaceImage> GetByIdAsync(Guid imageId);
		Task AddPlaceImage(PlaceImage placeImage);
		Task RemoveImageAsync(Guid imageId);
		Task<int> SaveChangesAsync();
		Task<List<PlaceImage>> GetAllImageOfPlaceAsync(Guid placeId);
    }
}
