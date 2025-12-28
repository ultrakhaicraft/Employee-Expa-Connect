using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.AdminManage
{
    public interface ICategoryRepository
    {
        Task CreateCategoryAsync(PlaceCategory category);
        IQueryable<PlaceCategory> GetAllCategoriesAsync();
        IQueryable<PlaceCategory> SearchCategories(string? name);
        Task<PlaceCategory> GetCategoryByIdAsync(int id);
        Task Update (PlaceCategory category);
        Task Delete(int id);
    }
}
