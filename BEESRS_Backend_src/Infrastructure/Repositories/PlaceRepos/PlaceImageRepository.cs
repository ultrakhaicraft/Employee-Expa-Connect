using Domain.Entities;
using Infrastructure.Interfaces.IPlaceRepos;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Repositories.PlaceRepos
{
	public class PlaceImageRepository : IPlaceImageRepository
	{
		private readonly BEESRSDBContext _context;

		public PlaceImageRepository(BEESRSDBContext context)
		{
			_context = context;
		}

		public async Task<PlaceImage> AddAsync(PlaceImage image)
		{
			await _context.PlaceImages.AddAsync(image);
			await _context.SaveChangesAsync();

			//Load related data 
			await _context.Entry(image)
				.Reference(p => p.Place)
				.LoadAsync();

			return image;
		}

		public async Task AddInBatchAsync(List<PlaceImage> images)
		{
			await _context.PlaceImages.AddRangeAsync(images);
		}

        public async Task<PlaceImage> GetByIdAsync(Guid imageId)
        {
            return await _context.PlaceImages.FindAsync(imageId);
        }
        public async Task AddPlaceImage(PlaceImage placeImage)
        {
            await _context.PlaceImages.AddAsync(placeImage);
        }

        public async Task RemoveImageAsync(Guid imageId)
        {
            var image = await _context.PlaceImages.FindAsync(imageId);
            if (image != null)
            {
                _context.PlaceImages.Remove(image);
            }
            else
                throw new KeyNotFoundException($"PlaceImage with ID {imageId} not found.");
        }

        public async Task<int> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync();
        }

        public async Task<List<PlaceImage>> GetAllImageOfPlaceAsync(Guid placeId)
        {
            return await _context.PlaceImages
                .Where(pi => pi.PlaceId == placeId)
                .OrderBy(pi => pi.SortOrder)
                .ToListAsync();
        }

        public async Task RemoveInBatchAsync(List<PlaceImage> images)
        {
            _context.PlaceImages.RemoveRange(images);
        }
    }
}
