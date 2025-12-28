using Domain.Entities;
using Infrastructure.Models.PlaceDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface ISearchHistoryService
    {
        Task AddSearchHistoryAsync(Guid userId, CreateSearchHistory createSearchHistory);
        Task<List<SearchHistoryDTO>> GetSearchHistoriesByUserIdAsync(Guid userId);
        Task DeleteSearchHistoryAsync(Guid searchHistoryId, Guid userId);
        Task DeleteAllSearchHistoryAsync(Guid userId);
    }
}
