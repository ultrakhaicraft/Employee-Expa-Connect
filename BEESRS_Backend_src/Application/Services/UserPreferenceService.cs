using Application.Interfaces;
using AutoMapper;
using Domain.Entities;
using Infrastructure.Helper.Enum;
using Infrastructure.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Models.UserPreferenceDTO;
using Infrastructure.Models.UserProfileDTO;
using Infrastructure.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Services
{
    public class UserPreferenceService : IUserPreferenceService
	{
		private readonly IUserPreferenceRepository _userPreferenceRepository;	
		private readonly IMapper _mapper;

		public UserPreferenceService(IUserPreferenceRepository userPreferenceRepository, IMapper mapper)
		{
			_userPreferenceRepository = userPreferenceRepository;
			_mapper = mapper;
		}

		public async Task<ApiResponse<bool>> DeleteUserPreferenceAsync(Guid preferenceId)
		{
			try
			{
				await _userPreferenceRepository.DeleteAsync(preferenceId);
				return ApiResponse<bool>.SuccessResult(true, message: "Delete user preference successfully");

			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<bool>.ErrorResultWithCode("Failed to delete user preference due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
						{
							e.Message ?? "Exception error caught during deleting user preference"
						}
				);
			}
		}

		public async Task<ApiResponse<PagedResult<UserPreferenceViewDto>>> GetAllUserPreferencePagedAsync(PagedRequest request)
		{
			try
			{
				var pagedData = await _userPreferenceRepository.GetAllUserPreference(request);

				if (pagedData == null || pagedData.Items == null || pagedData.Items.Count == 0)
				{
					return ApiResponse<Infrastructure.Models.Common.PagedResult<UserPreferenceViewDto>>.ErrorResultWithCode("No user preference found",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"No user preference found in database"
						}
					);
				}

				var mapped = pagedData.Items.Select(u => _mapper.Map<UserPreferenceViewDto>(u)).ToList();
				var DtoData = new Infrastructure.Models.Common.PagedResult<UserPreferenceViewDto>(pagedData.Page, pagedData.PageSize, pagedData.TotalItems, mapped);

				return ApiResponse<Infrastructure.Models.Common.PagedResult<UserPreferenceViewDto>>.SuccessResult(DtoData, message: "Get all user preference successfully");

			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<Infrastructure.Models.Common.PagedResult<UserPreferenceViewDto>>.ErrorResultWithCode("Failed to getting all user preference",
						errorStatusCode: (int)ResponseCode.InternalServerError,
						new List<string>()
						{
							e.Message ?? "Exception error caught during getting all user preference"
						}
				);

			}
		}

		public async Task<ApiResponse<UserPreferenceDetailDto>> GetUserPreferenceDetailById(Guid preferenceId)
		{
			try
			{
				var result = await _userPreferenceRepository.GetByIdAsync(preferenceId);
				if (result != null)
				{
					var dto = _mapper.Map<UserPreferenceDetailDto>(result);
					return ApiResponse<UserPreferenceDetailDto>.SuccessResult(dto, message: "Get user preference successfully");
				}
				else
				{
					return ApiResponse<UserPreferenceDetailDto>.ErrorResultWithCode("Failed to get user preference detail", 
						errorStatusCode: (int)ResponseCode.InternalServerError,
						new List<string>()
						{
							"User preference not found in database"
						}
				);
				}

			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<UserPreferenceDetailDto>.ErrorResultWithCode("Failed to get user preference detail", 
					errorStatusCode: (int)ResponseCode.InternalServerError, 
					new List<string>()
						{
							e.Message ?? "Exception error caught during getting user preference"
						}
				);
			}
		}

        public async Task<UserPreferenceDetailDto> GetUserPreferenceDetailByUserId(Guid userId)
        {
			var userPre = await _userPreferenceRepository.GetByUserIdAsync(userId);
			if (userPre == null)
				throw new KeyNotFoundException("Can not found user preference of this user.");

			return _mapper.Map<UserPreferenceDetailDto>(userPre);
        }

        public async Task<UserPreferenceDetailDto> UpdateUserPreferenceAsync(UserPreferenceUpdateDto userPreferenceUpdateDto, Guid userId)
        {
			var userPre = await _userPreferenceRepository.GetByUserIdAsync(userId);
            if (userPre == null)
                throw new InvalidOperationException("Can not found user preference of this user.");

			_mapper.Map(userPreferenceUpdateDto, userPre);
			await _userPreferenceRepository.UpdateAsync(userPre);

			return _mapper.Map<UserPreferenceDetailDto>(userPre);
        }

        public async Task<UserPreferenceDetailDto> CreateUserPreferenceAsync(UserPreferenceCreateDto request, Guid userId)
        {
			var userPre = await _userPreferenceRepository.GetByUserIdAsync(userId);
			if (userPre != null)
				throw new InvalidOperationException("This user already have an user preference.");

			var newUserPre = _mapper.Map<UserPreference>(request);
			newUserPre.UserId = userId;
            var result = await _userPreferenceRepository.CreateAsync(newUserPre);

			return _mapper.Map<UserPreferenceDetailDto>(result);
        }
    }
}
