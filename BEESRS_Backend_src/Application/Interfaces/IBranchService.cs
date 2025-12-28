using Domain.Entities;
using Infrastructure.Models.BranchDTO;
using Infrastructure.Models.Common;
using Infrastructure.Models.UserDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IBranchService
    {
        Task<PagedResult<BranchDTO>> GetAllBranch(OnlyPageRequest req);
        Task<PagedResult<BranchDTO>> SearchBranch(SearchBranchFilter filter, OnlyPageRequest req);
        Task<BranchDTO> GetBranchByIdAsync(Guid branchId);
        Task<BranchDTO> AddBranchAsync(CreateBranchDTO branch);
        Task<BranchDTO> UpdateBranchAsync(UpdateBranchDTO branch);
        Task<ApiResponse<UserInfoDto>> SaveBranchToUser(Guid userId, SaveBranchToUserDto request);
        Task RemoveBranch(Guid branchId);

        Task<List<City>> GetAllCityAsync(Guid? countryId);
        Task<List<Country>> GetAllCountryAsync();
        Task<List<Country>> GetCountriesWithBranchesAsync();
        Task<List<City>> GetCitiesWithBranchesAsync(Guid? countryId);
        Task<List<BranchDTO>> GetAllBranchWithNoPaging();
    }
}
