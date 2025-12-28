using Domain.Entities;
using Infrastructure.Models.AdminManageModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.IPlaceRepos
{
    public interface IPlaceTagAssignmentRepository
    {
        Task AssignTagIntoPlace(Guid placeId, int tagId, Guid userId);
        Task RemoveTagFromPlace(Guid placeId, int tagId);
        Task<List<PlaceTagDTO>> GetTagsOfPlace(Guid placeId);
    }
}
