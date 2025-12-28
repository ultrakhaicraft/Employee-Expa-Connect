using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.IPlaceRepos
{
    public interface ISearchHistoryRepository
    {
        Task AddSearchHistory(SearchHistory searchHistory);
        Task<List<SearchHistory>> GetSearchHistoriesQueryByUserId(Guid userId);
        Task<SearchHistory> GetSearchHistoryById(Guid searchHistoryId);
        Task DeleteSearchHistory(Guid searchHistoryId);
        Task DeleteAllSearchHistory(Guid userId);
    }
}
