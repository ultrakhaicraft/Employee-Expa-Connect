using AutoMapper;
using AutoMapper.QueryableExtensions;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Helper;
using Infrastructure.Interfaces.IPlaceRepos;
using Infrastructure.Models.Common;
using Infrastructure.Models.PlaceDTO;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite;
using NetTopologySuite.Geometries;
using NetTopologySuite.Mathematics;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Repositories.PlaceRepos
{
    public class PlaceRepository : IPlaceRepository
    {
        private readonly BEESRSDBContext _context;

        public PlaceRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public IQueryable<Place> GetAllPlace()
        {
            var places = _context.Places
                .AsNoTracking()
                .Include(p => p.PlaceCategory)
                .OrderByDescending(p => p.CreatedAt);

            return places;
        }

        public async Task<List<PlaceImage>> GetImagesByPlaceIdAsync(Guid placeId)
        {
            var placeWithImages = await _context.Places
                .Include(p => p.PlaceImages)
                .FirstOrDefaultAsync(p => p.PlaceId == placeId);

            if (placeWithImages == null)
            {
                return null;
            }

            //Setting up order
            placeWithImages.PlaceImages = placeWithImages.PlaceImages.OrderBy(pi => pi.SortOrder).ToList();

            if (placeWithImages.PlaceImages != null)
            {
                return placeWithImages.PlaceImages.ToList();
            }
            else
            {
                return null;
            }
        }

        public async Task<Place> CreatePlaceAsync(Place place)
        {
            if (!string.IsNullOrWhiteSpace(place.GooglePlaceId))
            {
                bool exists = await _context.Places
                    .AnyAsync(p => p.GooglePlaceId == place.GooglePlaceId && !p.IsDeleted);

                if (exists)
                    throw new InvalidOperationException(
                        $"GooglePlaceId '{place.GooglePlaceId}' already exists.");
            }

            var existsPlace = await _context.Places
                    .FirstOrDefaultAsync(p =>
                        p.Name == place.Name &&
                        p.AddressLine1 == place.AddressLine1 &&
                        p.City == place.City &&
                        !p.IsDeleted
                    );

            if (existsPlace != null)
                throw new InvalidOperationException(
                    $"Place already exists.");

            var geometryFactory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);
            place.GeoLocation = geometryFactory.CreatePoint(new Coordinate(place.Longitude, place.Latitude));
            _context.Places.Add(place);

            await _context.Entry(place)
                .Reference(p => p.PlaceCategory)
                .LoadAsync();
            return place;
        }
        public async Task<int> UpdateAsync(Place place)
        {
            var p = await _context.Places.FirstOrDefaultAsync(p => p.PlaceId == place.PlaceId && !p.IsDeleted);
            if (p == null)
                throw new KeyNotFoundException($"Place with ID {place.PlaceId} not found.");

            // Check if duplicate GooglePlaceId exists
            if (!string.IsNullOrWhiteSpace(place.GooglePlaceId))
            {
                bool exists = await _context.Places
                    .AnyAsync(p => p.GooglePlaceId == place.GooglePlaceId && p.PlaceId != place.PlaceId);

                if (exists)
                    throw new InvalidOperationException(
                        $"GooglePlaceId '{place.GooglePlaceId}' already exists.");
            }

            _context.Entry(p).CurrentValues.SetValues(place);
            p.UpdatedAt = DateTime.UtcNow;

            var geometryFactory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);
            p.GeoLocation = geometryFactory.CreatePoint(new Coordinate(place.Longitude, place.Latitude));

            _context.Places.Update(p);
            return await _context.SaveChangesAsync();
        }

        public async Task<int> DeleteAsync(Guid placeId)
        {
            var place = await _context.Places.FindAsync(placeId);
            if (place != null)
            {
                place.IsDeleted = true;
                place.UpdatedAt = DateTime.UtcNow;
                _context.Places.Update(place);
                return await _context.SaveChangesAsync();
            }
            else
                throw new KeyNotFoundException($"Place with ID {placeId} not found.");
        }

        public async Task<Place> GetByIdAsync(Guid id, Guid userId)
        {
            var place = await _context.Places
                .Include(p => p.PlaceImages)
                .Include(p => p.PlaceTagAssignments)
                .Include(p => p.PlaceCategory)
                .Include(p => p.PlaceReviews)
                .Include(p => p.CreatedByUser)
                    .ThenInclude(u => u.UserProfile)
                .Include(p => p.PlaceVotes.Where(pv => pv.UserId == userId))
                .FirstOrDefaultAsync(p => p.PlaceId == id && p.IsDeleted == false);
            if (place == null)
                throw new KeyNotFoundException($"Place with ID {id} not found.");
            return place;
        }

        public async Task<IEnumerable<Place>> GetByBoundingBoxAsync(PlaceBoundingBoxSearchFilter filter)
        {
            var geometryFactory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

            var shell = new[]
            {
                new Coordinate(filter.MinLongitude, filter.MinLatitude),
                new Coordinate(filter.MaxLongitude, filter.MinLatitude),
                new Coordinate(filter.MaxLongitude, filter.MaxLatitude),
                new Coordinate(filter.MinLongitude, filter.MaxLatitude),
                new Coordinate(filter.MinLongitude, filter.MinLatitude)
            };
            var bbox = geometryFactory.CreatePolygon(shell);

            var query = _context.Places
                .Include(p => p.PlaceCategory)
                .Where(p => p.GeoLocation != null &&
                    p.GeoLocation.Intersects(bbox) &&
                    p.IsDeleted == false &&
                    p.VerificationStatus == PlaceVerificationStatus.Approved);

            // Filter with PriceLevel
            if (filter.PriceLevel.HasValue)
                query = query.Where(p => p.PriceLevel == filter.PriceLevel.Value);

            // Filter with MinAverageRating
            if (filter.MinAverageRating > 0)
                query = query.Where(p => p.AverageRating >= filter.MinAverageRating);

            // Filter with CategoryId
            if (filter.CategoryId.HasValue)
                query = query.Where(p => p.CategoryId == filter.CategoryId.Value);

            // Filter if openNow
            if (filter.openNow)
            {
                var now = DateTime.Now.TimeOfDay;
                query = query.Where(p =>
                    p.OpenTime != null &&
                    p.CloseTime != null &&
                    p.OpenTime <= now && now <= p.CloseTime);
            }

            return await query.ToListAsync();
        }

        public IQueryable<Place> SearchPlacesByNameOrAdrress(string name)
        {
            var query = _context.Places
                .AsNoTracking()
                .Include(p => p.PlaceCategory)
                .Where(p => !p.IsDeleted && p.VerificationStatus == PlaceVerificationStatus.Approved);

            if (!string.IsNullOrWhiteSpace(name))
                query = query.Where(p =>
                        p.Name.Contains(name) || p.AddressLine1.Contains(name));

            return query;
        }
        public IQueryable<Place> SearchPlacesNearBy(string? name, double userLat, double userLng)
        {
            var userLocation = new Point(userLng, userLat) { SRID = 4326 };

            var query = _context.Places
                .AsNoTracking()
                .Include(p => p.PlaceCategory)
                .Where(p => !p.IsDeleted && p.VerificationStatus == PlaceVerificationStatus.Approved);

            if (!string.IsNullOrWhiteSpace(name))
                query = query.Where(p =>
                    p.Name.Contains(name) ||
                    p.AddressLine1.Contains(name) ||
                    p.PlaceCategory.Name.Contains(name) ||
                    (p.SuitableFor != null && p.SuitableFor.Contains(name))
                );

            query = query
                .Where(p => p.GeoLocation != null)
                .OrderBy(p => p.GeoLocation.Distance(userLocation));

            return query;
        }

        public IQueryable<Place> GetAllCreatedPlace(Guid userId)
        {
            var places = _context.Places
                .AsNoTracking()
                .Include(p => p.PlaceCategory)
                .Where(p => p.CreatedBy == userId && p.IsDeleted == false)
                .OrderByDescending(p => p.CreatedAt);


            return places;
        }

        public IQueryable<Place> GetAllCreatedPlaceOf(Guid userId, Guid ownerId)
        {
            var places = _context.Places
                .AsNoTracking()
                .Include(p => p.PlaceCategory)
                .Include(p => p.CreatedByUser)
                    .ThenInclude(u => u.UserProfile)
                .Include(p => p.PlaceImages)
                .Include(p => p.PlaceVotes.Where(pv => pv.IsHelpful == true))
                .Include(p => p.SavedPlaces.Where(sp => sp.UserId == userId))
                .Include(p => p.PlaceReviews.Where(r => r.UserId == userId || r.ModerationStatus == ReviewStatus.Approved))
                    .ThenInclude(pr => pr.ReviewVotes.Where(rv => rv.IsHelpful == true))
                .Include(p => p.PlaceReviews)
                    .ThenInclude(pr => pr.ReviewImages)
                .Include(p => p.PlaceReviews)
                    .ThenInclude(pr => pr.User)
                        .ThenInclude(u => u.UserProfile)
                .Include(p => p.Branch)
                .Where(p => p.CreatedBy == ownerId &&
                            p.IsDeleted == false &&
                            p.VerificationStatus == PlaceVerificationStatus.Approved)
                .OrderByDescending(p => p.CreatedAt);
            return places;
        }

        public Task<List<PlaceCategory>> GetAllPlaceCategory()
        {
            var categories = _context.PlaceCategories
                .AsNoTracking()
                .Where(c => c.IsActive)
                .OrderBy(c => c.SortOrder)
                .ThenBy(c => c.Name)
                .ToListAsync();

            return categories;
        }

        public async Task<IQueryable<Place>> GetAllPendingPlaceAsync(Guid branchId)
        {
            var places = _context.Places
                .AsNoTracking()
                .Include(p => p.PlaceCategory)
                .Include(p => p.CreatedByUser)
                .Include(p => p.PlaceImages)
                .Where(p => p.VerificationStatus == PlaceVerificationStatus.Pending && p.IsDeleted == false && p.BranchId == branchId);
            return places;
        }

        public async Task<int> VerifyPlaceAsync(Guid placeId, PlaceVerificationStatus status, string? notes)
        {
            var place = await _context.Places.FindAsync(placeId);
            if (place == null)
                throw new KeyNotFoundException($"Place with ID {placeId} not found.");

            place.VerificationStatus = status;
            place.VerificationNotes = notes;
            place.VerifiedAt = DateTimeOffset.UtcNow;
            place.UpdatedAt = DateTimeOffset.UtcNow;
            _context.Places.Update(place);
            return await _context.SaveChangesAsync();
        }

        public async Task UpdateAverage(Guid placeId)
        {
            var place = await _context.Places
                .Include(p => p.PlaceReviews)
                .FirstOrDefaultAsync(p => p.PlaceId == placeId);

            if (place == null)
                throw new KeyNotFoundException($"Place with ID {placeId} not found.");

            if (place.PlaceReviews != null && place.PlaceReviews.Count > 0)
            {
                var reviewss = place.PlaceReviews;
                place.PriceLevel = (int)Math.Round(reviewss.Average(r => r.PriceLevelRating), 2);
                place.AverageRating = (decimal)Math.Round(reviewss.Average(r => r.OverallRating), 2);
                place.TotalReviews = reviewss.Count();
            } else if(place.PlaceReviews == null || place.PlaceReviews.Count == 0)
            {
                place.PriceLevel = null;
                place.AverageRating = 0;
                place.TotalReviews = 0;
            }
                _context.Places.Update(place);
            await _context.SaveChangesAsync();
        }

        public IQueryable<Place> GetAllPlaceByBranchId(Guid branchId, Guid userId)
        {
            var places = _context.Places
                .AsNoTracking()
                .Include(p => p.PlaceCategory)
                .Include(p => p.CreatedByUser)
                    .ThenInclude(u => u.UserProfile)
                .Include(p => p.PlaceImages)
                .Include(p => p.PlaceVotes.Where(pv => pv.IsHelpful == true))
                .Include(p => p.SavedPlaces.Where(sp => sp.UserId == userId))
                .Include(p => p.PlaceReviews.Where(r => r.UserId == userId || r.ModerationStatus == ReviewStatus.Approved))
                    .ThenInclude(pr => pr.ReviewVotes.Where(rv => rv.IsHelpful == true))
                .Include(p => p.PlaceReviews)
                    .ThenInclude(pr => pr.ReviewImages)
                .Include(p => p.PlaceReviews)
                    .ThenInclude(pr => pr.User)
                        .ThenInclude(u => u.UserProfile)
                .Include(p => p.Branch)
                .Where(p => p.BranchId == branchId &&
                            p.IsDeleted == false &&
                            p.VerificationStatus == PlaceVerificationStatus.Approved)
                .OrderByDescending(p => p.CreatedAt);
            return places;
        }
        public async Task AddLikeToPlace(Guid placeId)
        {
            var place = await _context.Places.FindAsync(placeId);
            if (place == null)
                throw new KeyNotFoundException($"Place with ID {placeId} not found.");
            place.TotalLikes += 1;
            _context.Places.Update(place);
        }
        public async Task DeleteLikeToPlace(Guid placeId)
        {
            var place = await _context.Places.FindAsync(placeId);
            if (place == null)
                throw new KeyNotFoundException($"Place with ID {placeId} not found.");
            place.TotalLikes -= 1;
            _context.Places.Update(place);
        }
        public async Task LikePlaceAsync(Guid userId, Guid placeId)
        {
            var existingLike = await _context.PlaceVotes
                .FirstOrDefaultAsync(pv => pv.UserId == userId && pv.PlaceId == placeId);

            if (existingLike is null)
            {
                var newLike = new PlaceVote
                {
                    PlaceId = placeId,
                    UserId = userId,
                    IsHelpful = true,
                    VotedAt = DateTimeOffset.UtcNow
                };

                _context.PlaceVotes.Add(newLike);
            }
            else if (!existingLike.IsHelpful)
            {
                existingLike.IsHelpful = true;
                _context.PlaceVotes.Update(existingLike);
            }
            else
                throw new InvalidOperationException("User has already liked this place.");
        }

        public async Task DislikePlaceAsync(Guid userId, Guid placeId)
        {
            var existingLike = await _context.PlaceVotes
                .FirstOrDefaultAsync(pv => pv.UserId == userId && pv.PlaceId == placeId);

            if (existingLike is null)
            {
                var newLike = new PlaceVote
                {
                    PlaceId = placeId,
                    UserId = userId,
                    IsHelpful = false,
                    VotedAt = DateTimeOffset.UtcNow
                };
                _context.PlaceVotes.Add(newLike);
            }
            else if (existingLike.IsHelpful)
            {
                existingLike.IsHelpful = false;
                _context.PlaceVotes.Update(existingLike);
            }
            else
                throw new InvalidOperationException("User has already disliked this place.");
        }

        public IQueryable<Place> GetAllLikedPlaces(Guid userId)
        {
            return _context.Places
                .AsNoTracking()
                .Include(p => p.PlaceCategory)
                .Include(p => p.CreatedByUser)
                    .ThenInclude(u => u.UserProfile)
                .Include(p => p.PlaceImages)
                .Include(p => p.PlaceReviews
                    .Where(r => r.UserId == userId || r.ModerationStatus == ReviewStatus.Approved))
                    .ThenInclude(r => r.ReviewVotes)
                .Include(p => p.PlaceReviews
                    .Where(r => r.UserId == userId || r.ModerationStatus == ReviewStatus.Approved))
                    .ThenInclude(r => r.ReviewImages)
                .Include(p => p.Branch)
                .Include(p => p.PlaceVotes)
                .Where(p => !p.IsDeleted &&
                            p.VerificationStatus == PlaceVerificationStatus.Approved &&
                            p.PlaceVotes.Any(pv => pv.UserId == userId && pv.IsHelpful));
        }

        public IQueryable<Place> GetPlacesForHome(Guid? branchId, int? categoryId)
        {
            var query = _context.Places
                .AsNoTracking()
                .Where(p => !p.IsDeleted &&
                            p.VerificationStatus == PlaceVerificationStatus.Approved);

            if(branchId.HasValue)
                query = query.Where(p => p.BranchId == branchId.Value);

            if(categoryId.HasValue)
                query = query.Where(p => p.CategoryId == categoryId.Value);

            return query;
        }

        public async Task<List<Place>> GetPlacesByIdsWithDetailsAsync(List<Guid> placeIds, Guid userId)
        {
            var places = await _context.Places
                .AsNoTracking()
                .Include(p => p.PlaceCategory)
                .Include(p => p.Branch)
                .Include(p => p.PlaceImages)
                .Include(p => p.CreatedByUser)
                    .ThenInclude(u => u.UserProfile)
                .Include(p => p.SavedPlaces.Where(sp => sp.UserId == userId))
                .Include(p => p.PlaceVotes.Where(pv => pv.IsHelpful))
                .Include(p => p.PlaceReviews)
                .Where(p => placeIds.Contains(p.PlaceId))
                .ToListAsync();

            var orderedPlaces = placeIds
                .Select(id => places.FirstOrDefault(p => p.PlaceId == id))
                .Where(p => p != null)
                .ToList();

            return orderedPlaces;
        }

        public async Task<Place> GetByGooglePlaceIdAsync(string googlePlaceId)
        {
            if (string.IsNullOrWhiteSpace(googlePlaceId))
                return null;

            return await _context.Places
                .AsNoTracking()
                .Include(p => p.PlaceCategory)
                .FirstOrDefaultAsync(p => p.GooglePlaceId == googlePlaceId && !p.IsDeleted);
        }
    }
}
