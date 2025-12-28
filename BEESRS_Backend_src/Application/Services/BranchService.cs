using Application.Interfaces;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using Domain.Entities;
using Infrastructure.Helper;
using Infrastructure.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Models.BranchDTO;
using Infrastructure.Models.PlaceDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static QuestPDF.Helpers.Colors;
using Infrastructure.Models.UserDTO;
using Infrastructure.Helper.Enum;
using NetTopologySuite.Utilities;
using Microsoft.EntityFrameworkCore;

namespace Application.Services
{
    public class BranchService : IBranchService
    {
        private readonly IBranchRepository _branchRepository;
        private readonly IUserRepository _userRepository;
        private readonly IMapper _mapper;
        public BranchService(IBranchRepository BranchRepository,IUserRepository userRepository, IMapper mapper)
        {
            _branchRepository = BranchRepository;
            _userRepository = userRepository;
			_mapper = mapper;
        }

        public async Task<BranchDTO> AddBranchAsync(CreateBranchDTO branch)
        {
            var addedBranch = await _branchRepository.AddBranchAsync(_mapper.Map<Branch>(branch));
            return _mapper.Map<BranchDTO>(addedBranch);
        }

        public async Task<PagedResult<BranchDTO>> GetAllBranch(OnlyPageRequest req)
        {
            var branchs = _branchRepository.GetAllBranch();

            var pagedResult = await PageConverter<BranchDTO>.ToPagedResultAsync(
                req.Page, req.PageSize, (branchs).Count(), ( branchs).ProjectTo<BranchDTO>(_mapper.ConfigurationProvider));

            return pagedResult;
        }

        public async Task<BranchDTO> GetBranchByIdAsync(Guid branchId)
        {
            var branch = await _branchRepository.GetBranchByIdAsync(branchId);
            return _mapper.Map<BranchDTO>(branch);
        }

        public async Task<PagedResult<BranchDTO>> SearchBranch(SearchBranchFilter filter, OnlyPageRequest req)
        {
            var branchs = _branchRepository.SearchBranch(filter.Name, filter.CountryId, filter.CityId);
            var pagedResult = await PageConverter<BranchDTO>.ToPagedResultAsync(
                req.Page, req.PageSize, (branchs).Count(), (branchs).ProjectTo<BranchDTO>(_mapper.ConfigurationProvider));

            return pagedResult;
        }

        public async Task<BranchDTO> UpdateBranchAsync(UpdateBranchDTO branch)
        {
            var updatedBranch = await _branchRepository.UpdateBranchAsync(_mapper.Map<Branch>(branch));
            return _mapper.Map<BranchDTO>(updatedBranch);
        }

        public async Task<ApiResponse<UserInfoDto>> SaveBranchToUser(Guid userId, SaveBranchToUserDto request)
        {
            try
            {
                var user = await _userRepository.GetByIdAsync(userId);
                if(user == null)
                {
					return ApiResponse<UserInfoDto>.ErrorResultWithCode("Failed to save branch to User",
						(int)ResponseCode.BadRequest, new List<string>()
						{
							"User can't be found with Id" + request.SaveToUserId
						});
				}

				var currentBranch = await _branchRepository.GetBranchByIdAsync(request.CurrentBanchId);
				if (currentBranch == null)
				{
					return ApiResponse<UserInfoDto>.ErrorResultWithCode("Failed to save branch to User",
						(int)ResponseCode.BadRequest, new List<string>()
						{
							"User current branch can't be found with Id" + request.CurrentBanchId
						});
				}

                user.CurrentBranchId = request.CurrentBanchId;

                await _userRepository.UpdateAsync(user);

				var updatedUser = await _userRepository.GetByIdAsync(userId);

				var userDto = _mapper.Map<UserInfoDto>(updatedUser);

                return ApiResponse<UserInfoDto>.SuccessResult(userDto, "Branch saved to User successfully");

			}
            catch (Exception e)
            {

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<UserInfoDto>.ErrorResult("Failed to save branch to User due to Exception", new List<string>()
						{
							e.Message ?? "Exception error caught saving branch to User"
						}
				);
			}
		}

        public Task<List<City>> GetAllCityAsync(Guid? countryId)
        {
            return _branchRepository.GetAllCityAsync(countryId);
        }

        public Task<List<Country>> GetAllCountryAsync()
        {
            return _branchRepository.GetAllCountryAsync();
        }

        public Task<List<Country>> GetCountriesWithBranchesAsync()
        {
            return _branchRepository.GetCountriesWithBranchesAsync();
        }

        public Task<List<City>> GetCitiesWithBranchesAsync(Guid? countryId)
        {
            return _branchRepository.GetCitiesWithBranchesAsync(countryId);
        }

        public async Task RemoveBranch(Guid branchId)
        {
            await _branchRepository.RemoveBranchAsync(branchId);
        }

        public async Task<List<BranchDTO>> GetAllBranchWithNoPaging()
        {
            var query = _branchRepository.GetAllBranch();
            return await query.ProjectTo<BranchDTO>(_mapper.ConfigurationProvider).OrderBy(b => b.Name).ToListAsync();
        }
    }
}
