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
    public class PlaceTagRepository : IPlaceTagRepository
    {
        private readonly BEESRSDBContext _context;
        public PlaceTagRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task CreatePlaceTagAsync(PlaceTag placeTag)
        {
            await _context.PlaceTags.AddAsync(placeTag);
            await _context.SaveChangesAsync();
        }

        public async Task Delete(int id)
        {
            var placeTag = _context.PlaceTags.FirstOrDefault(t => t.TagId == id && t.IsActive == true);
            if (placeTag == null)
                throw new InvalidDataException("Can not found this plac tag!");

            placeTag.IsActive = false;
            _context.PlaceTags.Update(placeTag);
            await _context.SaveChangesAsync();
        }

        public IQueryable<PlaceTag> GetAllPlaceTags()
        {
            return _context.PlaceTags.Where(t => t.IsActive == true).AsQueryable();
        }

        public async Task<PlaceTag> GetPlaceTagByIdAsync(int id)
        {
            var placeTag = await _context.PlaceTags.FirstOrDefaultAsync(t => t.TagId == id && t.IsActive == true);
            if (placeTag == null)
                throw new InvalidDataException("Can not found this place tag!");

            return placeTag;
        }

        public IQueryable<PlaceTag> SearchPlaceTags(string? name)
        {
            var query = _context.PlaceTags.Where(t => t.IsActive == true).AsQueryable();
            if (!string.IsNullOrEmpty(name))
                query = query.Where(t => t.Name.Contains(name));

            return query;
        }

        public Task Update(PlaceTag placeTag)
        {
            _context.PlaceTags.Update(placeTag);
            return _context.SaveChangesAsync();
        }
    }
}
