using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.IPlaceRepos
{
    public interface IReviewImageRepository
    {
        Task<ReviewImage> AddReviewImageAsync(ReviewImage image);
        Task AddImageList(IEnumerable<ReviewImage> images);
        Task<List<ReviewImage>> GetReviewImagesByReviewIdAsync(Guid reviewId);
        void RemoveImage(Guid imageId);
        void RemoveImageList(List<ReviewImage> imageIds);
    }
}
