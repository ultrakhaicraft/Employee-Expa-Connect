using Domain.Entities;
using Infrastructure.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Repositories
{
    public class BranchRepository : IBranchRepository
    {
        private readonly BEESRSDBContext _context;
        public BranchRepository(BEESRSDBContext context)
        {
            _context = context;
        }
        public async Task<Branch> AddBranchAsync(Branch branch)
        {
            await _context.Branches.AddAsync(branch);
            await _context.SaveChangesAsync();

            return branch;
        }

        public IQueryable<Branch> GetAllBranch()
        {
            var departments = _context.Branches
                .AsNoTracking()
                .Include(b => b.City)
                .Include(b => b.Country)
                .Where(b => b.IsActive == true)
                .AsQueryable();
            return departments;
        }

        public async Task<Branch> GetBranchByIdAsync(Guid branchId)
        {
			if (branchId == Guid.Empty)
				return null;

			var branch = await _context.Branches
                .Include(b => b.City)
                .Include(b => b.Country)
                .FirstOrDefaultAsync(b => b.BranchId == branchId && b.IsActive == true);
			if (branch == null)
			{
				Console.WriteLine("Branch with ID {0} not found.", branchId);
				return null;
			}

			return branch;
		}

        public IQueryable<Branch> SearchBranch(string? name, Guid? countryId, Guid? cityId)
        {
            var query = _context.Branches
                .AsNoTracking()
                .Include(b => b.City)
                .Include(b => b.Country)
                .AsQueryable();
            if (!string.IsNullOrWhiteSpace(name))
                query = query.Where(d => d.Name.Contains(name));

            if (countryId.HasValue)
                query = query.Where(d => d.CountryId == countryId.Value);

            if (cityId.HasValue)
                query = query.Where(d => d.CityId == cityId.Value);

            return query;
        }

        public async Task<Branch> UpdateBranchAsync(Branch branch)
        {
            var existingBranch = await GetBranchByIdAsync(branch.BranchId);

            _context.Entry(existingBranch).CurrentValues.SetValues(branch);
            existingBranch.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();
            return existingBranch;
        }

        public async Task<List<City>> GetAllCityAsync(Guid? countryId)
        {
            var query = _context.Cities.AsNoTracking().AsQueryable();
            if (countryId.HasValue)
            {
                query = query.Where(c => c.CountryId == countryId.Value);
            }
            return await query.ToListAsync();
        }

        public async Task<List<Country>> GetAllCountryAsync()
        {
            return await _context.Countries.AsNoTracking().ToListAsync();
        }

        public async Task<List<Country>> GetCountriesWithBranchesAsync()
        {
            // Lấy các countries có ít nhất 1 branch active
            var countryIds = await _context.Branches
                .AsNoTracking()
                .Where(b => b.IsActive == true)
                .Select(b => b.CountryId)
                .Distinct()
                .ToListAsync();

            return await _context.Countries
                .AsNoTracking()
                .Where(c => countryIds.Contains(c.CountryId))
                .OrderBy(c => c.Name)
                .ToListAsync();
        }

        public async Task<List<City>> GetCitiesWithBranchesAsync(Guid? countryId)
        {
            // Lấy các cities có ít nhất 1 branch active
            var cityIdsQuery = _context.Branches
                .AsNoTracking()
                .Where(b => b.IsActive == true);

            if (countryId.HasValue)
            {
                cityIdsQuery = cityIdsQuery.Where(b => b.CountryId == countryId.Value);
            }

            var cityIds = await cityIdsQuery
                .Select(b => b.CityId)
                .Distinct()
                .ToListAsync();

            var query = _context.Cities
                .AsNoTracking()
                .Where(c => cityIds.Contains(c.CityId));

            if (countryId.HasValue)
            {
                query = query.Where(c => c.CountryId == countryId.Value);
            }

            return await query
                .OrderBy(c => c.Name)
                .ToListAsync();
        }

        public Task RemoveBranchAsync(Guid branchId)
        {
            var branch = _context.Branches.FirstOrDefault(b => b.BranchId == branchId && b.IsActive == true);
            if (branch == null)
                throw new InvalidDataException("Branch not found.");

            branch.IsActive = false;
            _context.Branches.Update(branch);
            return _context.SaveChangesAsync();
        }
    }
}
