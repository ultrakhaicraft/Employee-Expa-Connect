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
    public class SearchHistoryRepository : ISearchHistoryRepository
    {
        private readonly BEESRSDBContext _context;
        public SearchHistoryRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task AddSearchHistory(SearchHistory searchHistory)
        {
            await _context.SearchHistories.AddAsync(searchHistory);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAllSearchHistory(Guid userId)
        {
            var hasHistory = await _context.SearchHistories.AnyAsync(sh => sh.UserId == userId && sh.ClickedPlaceId == null);
            if (!hasHistory)
                throw new InvalidOperationException("No search history found for this user.");

            await _context.SearchHistories
                .Where(sh => sh.UserId == userId && sh.ClickedPlaceId == null)
                .ExecuteDeleteAsync();
        }

        public async Task DeleteSearchHistory(Guid searchHistoryId)
        {
            var searchHistory = await _context.SearchHistories.FindAsync(searchHistoryId);

            if (searchHistory == null)
                throw new InvalidOperationException("Search history not found.");

            _context.SearchHistories.Remove(searchHistory);
            await _context.SaveChangesAsync();
        }

        public async Task<List<SearchHistory>> GetSearchHistoriesQueryByUserId(Guid userId)
        {
            return await _context.SearchHistories
                .Where(sh => sh.UserId == userId && sh.ClickedPlaceId == null)
                .OrderByDescending(sh => sh.SearchTimestamp)
                .Take(10)
                .ToListAsync();
        }

        public async Task<SearchHistory> GetSearchHistoryById(Guid searchHistoryId)
        {
            return await _context.SearchHistories.FindAsync(searchHistoryId);
        }
    }
}
