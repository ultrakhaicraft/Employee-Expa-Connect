using Domain.Entities;
using Domain.Enums;
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
    public class SavedPlaceRepository : ISavedPlaceRepository
    {
        private readonly BEESRSDBContext _context;
        public SavedPlaceRepository(BEESRSDBContext context)
        {
            _context = context;
        }
        public async Task AddToSavedPlacesAsync(Guid userId, Guid placeId)
        {
            var exists = await _context.SavedPlaces
                .AnyAsync(sp => sp.UserId == userId && sp.PlaceId == placeId);
            if (exists)
                throw new InvalidOperationException("Place is already saved by the user.");

            var savedPlace = new SavedPlace
            {
                UserId = userId,
                PlaceId = placeId
            };
            await _context.SavedPlaces.AddAsync(savedPlace);
            await _context.SaveChangesAsync();
        }

        public async Task<IQueryable<Place>> GetSavedPlaceIdsByUserIdAsync(Guid userId)
        {
            var listId = await _context.SavedPlaces
                .Where(sp => sp.UserId == userId)
                .Select(sp => sp.PlaceId)
                .ToListAsync();

            var places = _context.Places
                .AsNoTracking()
                .Include(p => p.PlaceCategory)
                .Include(p => p.CreatedByUser)
                    .ThenInclude(u => u.UserProfile)
                .Include(p => p.PlaceImages)
                .Include(p => p.PlaceVotes.Where(pv => pv.IsHelpful == true))
                .Include(p => p.SavedPlaces.Where(sp => sp.UserId == userId))
                .Include(p => p.PlaceReviews.Where(r => r.UserId == userId || r.ModerationStatus == ReviewStatus.Approved))
                    .ThenInclude(pr => pr.ReviewVotes)
                .Include(p => p.PlaceReviews)
                    .ThenInclude(pr => pr.ReviewImages)
                .Include(p => p.PlaceReviews)
                    .ThenInclude(pr => pr.User)
                        .ThenInclude(u => u.UserProfile)
                .Include(p => p.Branch)
                .Where(p => listId.Contains(p.PlaceId) &&
                p.IsDeleted == false &&
                p.VerificationStatus == PlaceVerificationStatus.Approved)
                .OrderByDescending(p => p.CreatedAt);
            return places;
        }

        public async Task RemoveFromSavedPlacesAsync(Guid userId, Guid placeId)
        {
            var savedPlace = _context.SavedPlaces
                .FirstOrDefault(sp => sp.UserId == userId && sp.PlaceId == placeId);

            if (savedPlace == null)
                throw new KeyNotFoundException("Saved place not found for the user.");

            _context.SavedPlaces.Remove(savedPlace);
            await _context.SaveChangesAsync();
        }
    }
}
