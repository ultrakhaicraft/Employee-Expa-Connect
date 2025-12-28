using Infrastructure.Models.AdminManageModel;
using Infrastructure.Models.Common;
using Infrastructure.Models.PlaceDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.AdminManage
{
    public interface IPlaceTagService
    {
        Task CreatePlaceTagAsync(CreatePlaceTagDTO createPlaceTagDTO);
        Task<PagedResult<PlaceTagDTO>> GetAllPlaceTagsAsync(OnlyPageRequest req);
        Task<PagedResult<PlaceTagDTO>> SearchPlaceTags(string? name, OnlyPageRequest req);
        Task<PlaceTagDTO> GetPlaceTagByIdAsync(int id);
        Task UpdatePlaceTagAsync(UpdatePlaceTagDTO updatePlaceTagDTO);
        Task DeletePlaceTagAsync(int id);
        Task<List<PlaceTagDTO>> GetAllTags();
    }
}
