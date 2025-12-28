using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.AdminManage
{
    public interface IPlaceTagRepository
    {
        Task CreatePlaceTagAsync(PlaceTag placeTag);
        IQueryable<PlaceTag> GetAllPlaceTags();
        IQueryable<PlaceTag> SearchPlaceTags(string? name);
        Task<PlaceTag> GetPlaceTagByIdAsync(int id);
        Task Update (PlaceTag placeTag);
        Task Delete(int id);
    }
}
