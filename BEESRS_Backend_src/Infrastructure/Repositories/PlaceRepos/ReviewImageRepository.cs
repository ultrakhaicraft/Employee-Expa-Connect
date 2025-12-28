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
    public class ReviewImageRepository : IReviewImageRepository
    {
        private readonly BEESRSDBContext _context;
        public ReviewImageRepository(BEESRSDBContext context)
        {
            _context = context;
        }
        public async Task<ReviewImage> AddReviewImageAsync(ReviewImage image)
        {
            var savedImage = await _context.ReviewImages.AddAsync(image);
            return savedImage.Entity;
        }

        public async Task AddImageList(IEnumerable<ReviewImage> images)
        {
            await _context.ReviewImages.AddRangeAsync(images);
        }

        public async Task<List<ReviewImage>> GetReviewImagesByReviewIdAsync(Guid reviewId)
        {
            var images = await _context.ReviewImages
                .Where(img => img.ReviewId == reviewId)
                .ToListAsync();
            return images;
        }

        public void RemoveImage(Guid imageId)
        {
            var image = _context.ReviewImages.Find(imageId);
            if (image == null)
                throw new KeyNotFoundException($"ReviewImage with ID {imageId} not found.");

            _context.ReviewImages.Remove(image);
        }

        public void RemoveImageList(List<ReviewImage> images)
        {
            _context.ReviewImages.RemoveRange(images);
        }
    }
}
