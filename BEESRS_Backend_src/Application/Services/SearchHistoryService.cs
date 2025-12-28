using Application.Interfaces;
using AutoMapper;
using Domain.Entities;
using Infrastructure.Interfaces.IPlaceRepos;
using Infrastructure.Models.PlaceDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Services
{
    public class SearchHistoryService : ISearchHistoryService
    {
        private readonly ISearchHistoryRepository _searchHistoryRepository;
        private readonly IMapper _mapper;

        public SearchHistoryService(ISearchHistoryRepository searchHistoryRepository, IMapper mapper)
        {
            _searchHistoryRepository = searchHistoryRepository;
            _mapper = mapper;
        }
        public async Task AddSearchHistoryAsync(Guid userId,CreateSearchHistory createSearchHistory)
        {
            var searchHistory = _mapper.Map<SearchHistory>(createSearchHistory);
            searchHistory.UserId = userId;
            await _searchHistoryRepository.AddSearchHistory(searchHistory);
        }

        public async Task DeleteAllSearchHistoryAsync(Guid userId)
        {
            await _searchHistoryRepository.DeleteAllSearchHistory(userId);
        }

        public async Task DeleteSearchHistoryAsync(Guid searchHistoryId, Guid userId)
        {
            var searchHistory = _searchHistoryRepository.GetSearchHistoryById(searchHistoryId);
            if (searchHistory.Result.UserId != userId)
                throw new UnauthorizedAccessException("You are not authorized to delete this search history.");

            await _searchHistoryRepository.DeleteSearchHistory(searchHistoryId);
        }

        public async Task<List<SearchHistoryDTO>> GetSearchHistoriesByUserIdAsync(Guid userId)
        {
            var result = await _searchHistoryRepository.GetSearchHistoriesQueryByUserId(userId);
            return _mapper.Map<List<SearchHistoryDTO>>(result);
        }
    }
}
