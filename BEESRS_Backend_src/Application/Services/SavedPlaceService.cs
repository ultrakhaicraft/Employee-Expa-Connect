using Application.Interfaces;
using AutoMapper;
using Infrastructure.Interfaces.IPlaceRepos;
using Infrastructure.Models.Common;
using Infrastructure.Models.PlaceDTO;
using Infrastructure.Repositories.PlaceRepos;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Services
{
    public class SavedPlaceService : ISavedPlaceService
    {
        private readonly ISavedPlaceRepository _savedPlaceRepository;
        private readonly IMapper _mapper;

        public SavedPlaceService(ISavedPlaceRepository savedPlaceRepository, IMapper mapper)
        {
            _savedPlaceRepository = savedPlaceRepository;
            _mapper = mapper;
        }

        public async Task<PagedResult<PlaceWithReviews>> GetSavedPlacesByUserIdAsync(Guid userId, OnlyPageRequest req)
        {
            var query = await _savedPlaceRepository.GetSavedPlaceIdsByUserIdAsync(userId);

            var totalCount = await query.CountAsync();
            var places = await query
                .OrderBy(f => f.CreatedAt)
                .Skip((req.Page - 1) * req.PageSize)
                .Take(req.PageSize)
                .ToListAsync();

            var placeList = _mapper.Map<List<PlaceWithReviews>>(places, opts =>
            {
                opts.Items["UserId"] = userId;
            });

            return new PagedResult<PlaceWithReviews>(
                req.Page,
                req.PageSize,
                totalCount,
                placeList
                );
        }

        public async Task RemoveSavedPlaceAsync(Guid userId, Guid placeId)
        {
            await _savedPlaceRepository.RemoveFromSavedPlacesAsync(userId, placeId);
        }

        public async Task SavePlaceAsync(Guid userId, Guid placeId)
        {
            await _savedPlaceRepository.AddToSavedPlacesAsync(userId, placeId);
        }
    }
}
