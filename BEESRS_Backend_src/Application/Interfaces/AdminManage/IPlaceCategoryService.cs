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
    public interface IPlaceCategoryService
    {
        Task CreateCategoryAsync(CreateCategoryDTO createCategoryDTO);
        Task<PagedResult<PlaceCategoryDTO>> GetAllCategoriesAsync(OnlyPageRequest req);
        Task<PagedResult<PlaceCategoryDTO>> SearchCategories(string? name, OnlyPageRequest req);
        Task<PlaceCategoryDTO> GetCategoryByIdAsync(int id);
        Task UpdateCategoryAsync(UpdateCategoryDTO updateCategoryDTO);
        Task DeleteCategoryAsync(int id);
    }
}
