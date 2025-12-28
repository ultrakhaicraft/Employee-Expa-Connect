using Domain.Entities;
using Infrastructure.Interfaces.AdminManage;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Repositories.AdminManage
{
    public class CategoryRepository : ICategoryRepository
    {
        private readonly BEESRSDBContext _context;
        public CategoryRepository(BEESRSDBContext context)
        {
            _context = context;
        }
        public async Task CreateCategoryAsync(PlaceCategory category)
        {
            await _context.PlaceCategories.AddAsync(category);
            await _context.SaveChangesAsync();
        }

        public async Task Delete(int id)
        {
            var category = _context.PlaceCategories.FirstOrDefault(c => c.CategoryId == id && c.IsActive == true);
            if(category == null)
                throw new InvalidDataException("Category not found");

            category.IsActive = false;
            _context.PlaceCategories.Update(category);
            await _context.SaveChangesAsync();
        }

        public IQueryable<PlaceCategory> GetAllCategoriesAsync()
        {
            return _context.PlaceCategories.Where(c => c.IsActive == true).AsQueryable();
        }

        public IQueryable<PlaceCategory> SearchCategories(string? name)
        {
            var query = _context.PlaceCategories.Where(c => c.IsActive == true).AsQueryable();
            if (!string.IsNullOrEmpty(name))
                query = query.Where(c => c.Name.Contains(name));

            return query;
        }

        public async Task<PlaceCategory> GetCategoryByIdAsync(int id)
        {
            var category = await _context.PlaceCategories.FirstOrDefaultAsync(c => c.CategoryId == id && c.IsActive == true);
            if(category == null)
                throw new InvalidDataException("Category not found");
            return category;
        }

        public async Task Update(PlaceCategory category)
        {
            _context.Update(category);
            await _context.SaveChangesAsync();
        }
    }
}
