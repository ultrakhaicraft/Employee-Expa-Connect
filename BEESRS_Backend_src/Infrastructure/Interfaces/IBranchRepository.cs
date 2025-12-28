using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IBranchRepository
    {
        IQueryable<Branch> GetAllBranch();
        IQueryable<Branch> SearchBranch(string? name, Guid? countryId, Guid? cityId);
        Task<Branch> GetBranchByIdAsync(Guid branchId);
        Task<Branch> AddBranchAsync(Branch branch);
        Task<Branch> UpdateBranchAsync(Branch branch);
        Task RemoveBranchAsync(Guid branchId);

        Task<List<City>> GetAllCityAsync(Guid? countryId);
        Task<List<Country>> GetAllCountryAsync();
        Task<List<Country>> GetCountriesWithBranchesAsync();
        Task<List<City>> GetCitiesWithBranchesAsync(Guid? countryId);
    }
}
