using Domain.Entities;
using Infrastructure.Interfaces.IPlaceRepos;
using Infrastructure.Models.AdminManageModel;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Repositories.PlaceRepos
{
    public class PlaceTagAssignmentRepository : IPlaceTagAssignmentRepository
    {
        private readonly BEESRSDBContext _context;

        public PlaceTagAssignmentRepository(BEESRSDBContext context)
        {
            _context = context;
        }
        public async Task AssignTagIntoPlace(Guid placeId, int tagId, Guid userId)
        {
            var existingAssignment = await _context.PlaceTagAssignments
                .FindAsync(placeId, tagId);

            // If the tag is already assign to place, do nothing
            if (existingAssignment != null)
                return;

            await _context.PlaceTagAssignments.AddAsync(new PlaceTagAssignment
            {
                PlaceId = placeId,
                TagId = tagId,
                AssignedBy = userId
            });
        }

        public async Task<List<PlaceTagDTO>> GetTagsOfPlace(Guid placeId)
        {
            var tags = await _context.PlaceTagAssignments
                .Include(pta => pta.PlaceTag)
                .Where(pta => pta.PlaceId == placeId)
                .Select(pta => new PlaceTagDTO
                {
                    TagId = pta.TagId,
                    Name = pta.PlaceTag.Name,
                    Description = pta.PlaceTag.Description,
                    IsActive = pta.PlaceTag.IsActive
                })
                .ToListAsync();
            return tags;
        }

        public async Task RemoveTagFromPlace(Guid placeId, int tagId)
        {
            var existingAssignment = await _context.PlaceTagAssignments
                .FindAsync(placeId, tagId);

            if (existingAssignment != null)
                _context.PlaceTagAssignments.Remove(existingAssignment);
        }

    }
}
