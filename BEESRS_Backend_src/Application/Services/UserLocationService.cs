using Application.Interfaces;
using AutoMapper;
using Infrastructure.Helper.Enum;
using Infrastructure.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Models.UserLocationDTO;
using Infrastructure.Models.UserPreferenceDTO;
using Infrastructure.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Services
{
	public class UserLocationService : IUserLocationService
	{
		private readonly IUserLocationRepository _userLocationRepository;
		private readonly IMapper _mapper;

		public UserLocationService(IUserLocationRepository userLocationRepository, IMapper mapper)
		{
			_userLocationRepository = userLocationRepository;
			_mapper = mapper;
		}

		public async Task<ApiResponse<Guid>> CreateUserLocationAsync(UserLocationCreateDto request)
		{
			try
			{
				var userProfile = _mapper.Map<Domain.Entities.UserLocation>(request);
				var result = await _userLocationRepository.CreateAsync(userProfile);

				if (result != null)
				{
					return ApiResponse<Guid>.SuccessResult(result.LocationId, message: "Create user location successfully");
				}
				else
				{
					return ApiResponse<Guid>.ErrorResultWithCode("Failed to create user location",
						errorStatusCode: (int)ResponseCode.InternalServerError,
						new List<string>()
						{
							 "Unable error to save user location"
						}
					);
				}
			}
			catch (Exception e)
			{
				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<Guid>.ErrorResultWithCode("Failed to create user location",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
						{
							e.Message ?? "Exception error caught during creating user location"
						}
				);
			}
		}

		public async Task<ApiResponse<bool>> DeleteUserLocationAsync(Guid userLocationId)
		{
			try
			{
				await _userLocationRepository.DeleteAsync(userLocationId);
				return ApiResponse<bool>.SuccessResult(true, message: "Delete user location successfully");

			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<bool>.ErrorResultWithCode("Failed to delete user location due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
						{
							e.Message ?? "Exception error caught during deleting user location"
						}
				);
			}
		}

		public async Task<ApiResponse<PagedResult<UserLocationViewDto>>> GetAllUserLocationPagedAsync(PagedRequest request)
		{
			try
			{
				var pagedData = await _userLocationRepository.GetAllUserLocation(request);

				if (pagedData == null || pagedData.Items == null || pagedData.Items.Count == 0)
				{
					return ApiResponse<Infrastructure.Models.Common.PagedResult<UserLocationViewDto>>.ErrorResultWithCode("No user location found",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"No user location found in database"
						}
					);
				}

				var mapped = pagedData.Items.Select(u => _mapper.Map<UserLocationViewDto>(u)).ToList();
				var DtoData = new Infrastructure.Models.Common.PagedResult<UserLocationViewDto>(pagedData.Page, pagedData.PageSize, pagedData.TotalItems, mapped);

				return ApiResponse<Infrastructure.Models.Common.PagedResult<UserLocationViewDto>>.SuccessResult(DtoData, message: "Get all user location successfully");

			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<Infrastructure.Models.Common.PagedResult<UserLocationViewDto>>.ErrorResultWithCode("Failed to getting all user location",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
						{
							e.Message ?? "Exception error caught during getting all user location"
						}
				);

			}
		}

		public async Task<ApiResponse<UserLocationDetailDto>> GetUserLocationDetailById(Guid userLocationId)
		{
			try
			{
				var result = await _userLocationRepository.GetByIdAsync(userLocationId);
				if (result != null)
				{
					var dto = _mapper.Map<UserLocationDetailDto>(result);
					return ApiResponse<UserLocationDetailDto>.SuccessResult(dto, message: "Get user location successfully");
				}
				else
				{
					return ApiResponse<UserLocationDetailDto>.ErrorResultWithCode("Failed to get user location detail",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"User location not found in database"
						}
				);
				}

			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<UserLocationDetailDto>.ErrorResultWithCode("Failed to get user location detail",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
						{
							e.Message ?? "Exception error caught during getting user location"
						}
				);
			}
		}

		public async Task<ApiResponse<bool>> UpdateUserLocationAsync(UserLocationUpdateDto request, Guid userLocationId)
		{
			try
			{
				var existingLocation = await _userLocationRepository.GetByIdAsync(userLocationId);
				if (existingLocation == null)
				{
					return ApiResponse<bool>.ErrorResultWithCode("Failed to update user location",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"User location not found in database"
						}
					);
				}
				//Applying request changes to existing entity
				var userLocation = _mapper.Map(request, existingLocation);

				await _userLocationRepository.UpdateAsync(userLocation);
				return ApiResponse<bool>.SuccessResult(true, message: "Update user location successfully");
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<bool>.ErrorResultWithCode("Failed to update user location",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
						{
							e.Message ?? "Exception error caught during updating user location"
						}
				);
			}
		}
	}
}
