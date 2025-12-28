using Application.Helper;
using Application.Interfaces;
using Application.Interfaces.ThirdParty;
using AutoMapper;
using CloudinaryDotNet.Actions;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Helper.Enum;
using Infrastructure.Interfaces;
using Infrastructure.Models.BranchDTO;
using Infrastructure.Models.Common;
using Infrastructure.Models.PlaceDTO;
using Infrastructure.Models.UserDTO;
using Infrastructure.Models.UserProfileDTO;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Text;
using System.Threading.Tasks;

namespace Application.Services
{
	//Manage User related operation, only use user and userProfile repos
	public class UserService : IUserService
	{
		private readonly IUserRepository _userRepository;
		private readonly IUserProfileRepository _userProfileRepository;
		private readonly IBranchRepository _branchRepository;
		private readonly IFriendshipRepository _friendshipRepository;
		private readonly ICloudinaryHelper _cloudinaryHelper;
		private readonly IMapper _mapper;
		private readonly ILogger<UserService> _logger;

		public UserService(IUserRepository userRepository, IBranchRepository branchRepository,IFriendshipRepository friendshipRepository, IUserProfileRepository userProfileRepository, ICloudinaryHelper cloudinaryHelper, IMapper mapper, ILogger<UserService> logger)
		{
			_userRepository = userRepository;
			_friendshipRepository = friendshipRepository;
			_userProfileRepository = userProfileRepository;
			_cloudinaryHelper = cloudinaryHelper;
			_branchRepository = branchRepository;
			_mapper = mapper;
			_logger = logger;
		}





		//Upload Image: To Cloudinary and To Database
		//TODO:
		// 1. Validate the image file (type, size, etc.)
		// 2. Ability to look for the existing avatar url and delete it from Cloudinary, then replace it with the new one
		public async Task<ApiResponse<UploadResultDto>> AddUserAvatarAsync(Guid userId, IFormFile imageFile)
		{

			try
			{
				//Only allow 10 MB pdf file size
				if (imageFile.Length > 10 * 1024 * 1024)
				{
					return ApiResponse<UploadResultDto>.ErrorResultWithCode("Failed to upload file due to validation", 
						errorStatusCode: (int) ResponseCode.BadRequest, new List<string>()
						{
							"Image file must not exceed 10MB"
						}
					);
				}

				var existingAvatarUrl = await _userProfileRepository.GetUserAvatarUrlByUserId(userId);

				if (!string.IsNullOrEmpty(existingAvatarUrl))
				{
					

					var deletionResult = await  _cloudinaryHelper.DeleteImageAsync(existingAvatarUrl, FolderTag.UserAvatar.ToString());
					if (deletionResult.Result != "ok" && deletionResult.Result != "not found")
					{
						return ApiResponse<UploadResultDto>.ErrorResultWithCode(
							"Failed to delete old avatar from Cloudinary",
							errorStatusCode: (int) ResponseCode.InternalServerError,
							new List<string> { deletionResult.Error?.Message ?? "Unknown delete error" }
						);
					}
				}

				//Upload the image to Cloudinary
				var resultDto = await _cloudinaryHelper.UploadSingleImageAsync(imageFile, FolderTag.UserAvatar.ToString());

				if(!resultDto.IsSuccess)
				{
					return ApiResponse<UploadResultDto>.ErrorResultWithCode("Failed to upload file due to Cloudinary service",
						errorStatusCode: (int) ResponseCode.InternalServerError,
						new List<string>()
						{
							resultDto.ErrorMessage ?? "Unknown error occurred during file upload"
						}
					);
				}

				//Add the avatar URL to the user's profile in the database
				await _userProfileRepository.AddUserAvatar(userId, resultDto.FileUrl);

				return ApiResponse<UploadResultDto>.SuccessResult(resultDto, message: "User avatar uploaded successfully");
			}
			//Unexpected error
			catch (Exception e)
			{
				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<UploadResultDto>.ErrorResultWithCode("Failed to upload file due to exception",
					errorStatusCode: (int) ResponseCode.InternalServerError,
					new List<string>()
						{
							e.Message ?? "Exception error caught during file upload"
						}
				);
			}
		}

		public async Task<ApiResponse<UserInfoDto>> GetCurrentUserAsync(Guid userId)
		{
			try
			{
				var user = await _userRepository.GetUserWithDetailsAsync(userId);
				if (user == null)
				{
					return ApiResponse<UserInfoDto>.ErrorResultWithCode("User not found", errorStatusCode: (int) ResponseCode.NotFound);
				}

				var userProfile = await _userProfileRepository.GetByUserIdAsync(userId);
				if (userProfile == null)
				{

					//Create an empty userProfile object if not found
					_logger.LogWarning("User profile not found for userId: {UserId}", userId);
					userProfile = new UserProfile
					{
						ProfileId = Guid.Empty,
						UserId = userId,
						HomeCountry = null,
						CurrentLocationCity = null,
						CurrentLocationCountry = null,
						Timezone = null,
						Bio = null,
						ProfilePictureUrl = null,
						DateFormat = null,
					};
				}
				var currentBranchData = await _branchRepository.GetBranchByIdAsync(user.CurrentBranchId);

				if(currentBranchData == null)
				{
					//Create an empty current branch object if not found
					_logger.LogWarning("Current Branch data not found for userId: {UserId}", userId);
					currentBranchData = new Branch
					{
						BranchId = Guid.Empty,
						Name = "N/A"
					};
				}

				var userInfoDto = BuildUserInfoDto(user, userProfile, currentBranchData?.Name ?? "N/A");


				return ApiResponse<UserInfoDto>.SuccessResult(userInfoDto);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error getting current user: {UserId}", userId);
				return ApiResponse<UserInfoDto>.ErrorResultWithCode("Failed to get user information", errorStatusCode:  (int)ResponseCode.InternalServerError);
			}
		}
		public async Task<ApiResponse<Guid>> CreateUserProfileAsync(UserProfileCreateDto request)
		{
			try
			{

				var userProfile = _mapper.Map<Domain.Entities.UserProfile>(request);
				var result = await _userProfileRepository.CreateAsync(userProfile);

				if (result != null)
				{
					return ApiResponse<Guid>.SuccessResult(result.ProfileId, message: "Create user Profile successfully");
				}
				else
				{
					return ApiResponse<Guid>.ErrorResultWithCode("Failed to create userProfile",
						errorStatusCode: (int)ResponseCode.InternalServerError,
						new List<string>()
						{
							 "Unable error to save userProfile"
						}
					);
				}
			}
			catch (Exception e)
			{
				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<Guid>.ErrorResult("Failed to create userProfile", new List<string>()
						{
							e.Message ?? "Exception error caught creating user profile"
						}
				);
			}
		}

		public async Task<ApiResponse<bool>> DeleteUserProfileAsync(Guid profileId)
		{
			try
			{
				await _userProfileRepository.DeleteAsync(profileId);
				return ApiResponse<bool>.SuccessResult(true, message: "Delete user profile successfully");

			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<bool>.ErrorResultWithCode("Failed to delete user profile due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
						{
							e.Message ?? "Exception error caught during deleting user profile"
						}
				);
			}
		}

		public async Task<ApiResponse<Infrastructure.Models.Common.PagedResult<UserProfileViewDto>>> GetAllUserProfilesPagedAsync
			(PagedRequest request, Guid currentUserId)
		{
			try
			{
				// Get paged data from repository
				var pagedData = await _userProfileRepository.GetAllUserProfile(request);

				if (pagedData == null || pagedData.Items == null || pagedData.Items.Count == 0)
				{
					return ApiResponse<Infrastructure.Models.Common.PagedResult<UserProfileViewDto>>.ErrorResultWithCode(
						"No user profile found",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string> { "No user profile found in database" }
					);
				}

				var mappedDtos = new List<UserProfileViewDto>();

				//Create DTO
				foreach (var profile in pagedData.Items)
				{
					var dto = _mapper.Map<UserProfileViewDto>(profile);

					// Load related user, skip user profile if the associated user is null
					var user = profile.User;
					if (user == null)
					{
						user = await _userRepository.GetByIdAsync(profile.UserId);
						if (user == null)
						{
							continue;
						}
					}

                    // Get Current Branch name
                    var currentBranch = await _branchRepository.GetBranchByIdAsync(user.CurrentBranchId);
                    string currentBranchName = currentBranch.Name;


                    //Get friendship status between current user and other user
                    var friendship = await _friendshipRepository.GetFriendshipByUserIdsAsync(currentUserId, user.UserId);
					string friendshipStatus = GetFriendshipStatus(friendship);


					

					// Assign values to DTO
					dto.CurrentBranch = currentBranchName;
					dto.FirstName = user.FirstName;
					dto.LastName = user.LastName;
					dto.FriendshipStatus = friendshipStatus;

					mappedDtos.Add(dto);
				}

				// Create paged result DTO
				var dtoPagedResult = new Infrastructure.Models.Common.PagedResult<UserProfileViewDto>(
					pagedData.Page,
					pagedData.PageSize,
					pagedData.TotalItems,
					mappedDtos
				);

				return ApiResponse<Infrastructure.Models.Common.PagedResult<UserProfileViewDto>>.SuccessResult(
					dtoPagedResult,
					message: "Get all user profiles successfully"
				);
			}
			catch (Exception e)
			{
				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<Infrastructure.Models.Common.PagedResult<UserProfileViewDto>>.ErrorResultWithCode(
					"Failed to get all user profiles",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>
					{
				e.Message ?? "Exception error caught during getting all user profiles"
					}
				);
			}
		}


		public async Task<ApiResponse<UserInfoDto>> GetOtherUserProfileDetailByUserId(Guid otherUserId,Guid currentUserId)
		{
			try
			{
				//Get data and validation

				var otherUser = await _userRepository.GetByIdAsync(otherUserId);

				if (otherUser == null)
				{
					return ApiResponse<UserInfoDto>.ErrorResultWithCode("Failed to get user profile detail",
						errorStatusCode: (int)ResponseCode.NotFound,
						 new List<string>()
						{
							"Associated user account not found in database"
						});
				}

				var userProfile = await _userProfileRepository.GetByUserIdAsync(otherUser.UserId);

				if(userProfile == null)
				{
					//Create an empty userProfile object if not found
					_logger.LogWarning("User profile not found for userId: {UserId}", otherUserId);
					userProfile = new UserProfile
					{
						ProfileId = Guid.Empty,
						UserId = otherUserId,
						HomeCountry = null,
						CurrentLocationCity = null,
						CurrentLocationCountry = null,
						Timezone = null,
						Bio = null,
						ProfilePictureUrl = null,
						DateFormat = null,
					};
				}

				Branch? currentBranchData = null;

                currentBranchData = await _branchRepository.GetBranchByIdAsync(otherUser.CurrentBranchId);


				//Get friendship status between current user and other user
				var friendship = await _friendshipRepository.GetFriendshipByUserIdsAsync(currentUserId, otherUserId);
				string friendshipStatus = GetFriendshipStatus(friendship);

				var userInfoDto = BuildUserInfoDto(otherUser, userProfile, currentBranchData?.Name ?? "N/A", friendshipStatus);
				
				return ApiResponse<UserInfoDto>.SuccessResult(userInfoDto, message: "Get other user profile detail successfully");

			}
			catch (Exception e)
			{

				/*
				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<UserInfoDto>.ErrorResult("Failed to get user profile detail", new List<string>()
						{
							e.Message ?? "Exception error caught during getting user profile"
						}
				);
				*/
				throw;
			}
		}

		public async Task<ApiResponse<bool>> UpdateUserProfileAsync(UserProfileUpdateDto request, Guid userProfileId)
		{
			try
			{
				var existing = await _userProfileRepository.GetByIdAsync(userProfileId);

				if(existing == null)
				{
					return ApiResponse<bool>.ErrorResultWithCode("Failed to update user profile",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"User profile not found in database"
						}
				);
				}

				//Applying request changes to existing entity
				var userProfile = _mapper.Map(request, existing);

				//Update the entity to database
				await _userProfileRepository.UpdateAsync(userProfile);
				return ApiResponse<bool>.SuccessResult(true, message: "Update user profile successfully");
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<bool>.ErrorResultWithCode("Failed to update user profile",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
						{
							e.Message ?? "Exception error caught during updating user profile"
						}
				);
			}
		}

		public async Task<ApiResponse<bool>> UpdateUserAndUserProfileAsync(UserAndUserProfileUpdateDto request, Guid userId)
		{

			try
			{
				if (request == null || userId == Guid.Empty)
				{

					return ApiResponse<bool>.ErrorResultWithCode("Failed to update user profile",
						errorStatusCode: (int)ResponseCode.BadRequest,
						new List<string>()
							{
							"Request body is null or userId is empty, please input both user profile and id information"
							}
					);
				}


				//Get entities from database
				var user = await _userRepository.GetByIdAsync(userId);
				if (user == null)
				{
					return ApiResponse<bool>.ErrorResultWithCode("User not found", errorStatusCode: (int)ResponseCode.NotFound);
				}

				var userProfile = await _userProfileRepository.GetByUserIdAsync(userId);

				//Apply changes from request to entities. Due to complication a special mapping function will be used
				user = MapToUser(request, user);
				await _userRepository.UpdateAsync(user);

				//If user profile not found, skip updating user profile
				if (userProfile != null)
				{
					userProfile = MapToUserProfile(request, userProfile);
					await _userProfileRepository.UpdateAsync(userProfile);

					return ApiResponse<bool>.SuccessResult(true, message: "User and user profile updated successfully");
				} else
				{
					return ApiResponse<bool>.SuccessResult(true, message: "User updated successfully, please create your user profile to update the user profile");
				}


					
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<bool>.ErrorResultWithCode("Failed to update user and user profile",
					errorStatusCode: (int) ResponseCode.InternalServerError,
					new List<string>()
						{
							e.Message ?? "Exception error caught during updating user and user profile"
						}
				);
			}


		}

		//Private method

		private UserInfoDto BuildUserInfoDto(User user, UserProfile userProfile, string currentBranchDataName, string? friendshipStatus=null)
		{
			var userInfo = _mapper.Map<UserInfoDto>(user);

			if (userProfile != null)
			{
				var userProfileDto = _mapper.Map<UserProfileDetailDto>(userProfile);
				userInfo.Profile = userProfileDto;
			}
			else
			{
				//If user profile not found, return an empty profile object
				var emptyProfile = new UserProfileDetailDto
				{

					HomeCountry = null,
					CurrentLocationCity = null,
					CurrentLocationCountry = null,
					Timezone = null,
					Bio = null,
					ProfilePictureUrl = null,
					CurrentBranch = null,
					DateFormat = null,
				};
				userInfo.Profile = emptyProfile;
			}

			userInfo.CurrentBranchId = user.CurrentBranchId;
			userInfo.CurrentBranch = currentBranchDataName;
			userInfo.Profile.CurrentBranch = currentBranchDataName;

			if(friendshipStatus == null)
			{
				userInfo.FriendshipStatus = "N/A";
			}
			else
			{
				userInfo.FriendshipStatus = friendshipStatus;
			}
				

			return userInfo;
		}

		private string GetFriendshipStatus(Friendship? friendship)
		{
			string friendshipStatus = string.Empty;
			if (friendship == null)
			{
				return "Not friend";
			}

			switch (friendship.Status)
			{
				case FriendshipStatus.Pending:
					friendshipStatus = "Pending";
					break;
				case FriendshipStatus.Accepted:
					friendshipStatus = "Friend";
					break;
				case FriendshipStatus.Rejected:
					friendshipStatus = "Not friend";
					break;
				case FriendshipStatus.Blocked:
					friendshipStatus = "Blocked";
					break;
				default:
					friendshipStatus = "N/A, Status is null";
					break;
			}

			return friendshipStatus;
		}


		private User MapToUser(UserAndUserProfileUpdateDto request, User existingUser)
		{
			existingUser.Email = request.Email;
			existingUser.FirstName = request.FirstName;
			existingUser.LastName = request.LastName;
			//existingUser.DepartmentId = request.Department ?? "Default Department";
			existingUser.PhoneNumber = request.PhoneNumber ?? "";
			existingUser.JobTitle = request.JobTitle ?? "Default Job Title";
			return existingUser;
		}

		
		private UserProfile MapToUserProfile(UserAndUserProfileUpdateDto request, UserProfile existingProfile)
		{
			existingProfile.HomeCountry = request.HomeCountry ?? "Default Home Country";
			existingProfile.CurrentLocationCity = request.CurrentLocationCity ?? "Default City";
			existingProfile.CurrentLocationCountry = request.CurrentLocationCountry ?? "Default Country";
			existingProfile.Timezone = request.Timezone ?? "UTC";
			existingProfile.Bio = request.Bio ?? "This user prefers to keep an air of mystery about them.";
			return existingProfile;
		}

		public async Task<ApiResponse<List<UserSearchResultDto>>> SearchUsersAsync(string query, Guid currentUserId)
		{
			try
			{
				if (string.IsNullOrWhiteSpace(query))
				{
					return ApiResponse<List<UserSearchResultDto>>.SuccessResult(new List<UserSearchResultDto>());
				}

				var users = await _userRepository.SearchUsersAsync(query, currentUserId, 20);

				var result = users.Select(u => new UserSearchResultDto
				{
					UserId = u.UserId,
					Email = u.Email,
					FirstName = u.FirstName,
					LastName = u.LastName,
					FullName = $"{u.FirstName} {u.LastName}".Trim(),
					ProfilePictureUrl = u.UserProfile?.ProfilePictureUrl,
					JobTitle = u.JobTitle,
					CurrentBranchId = u.CurrentBranchId,
					CurrentBranchName = u.CurrentBranch?.Name
				}).ToList();

				return ApiResponse<List<UserSearchResultDto>>.SuccessResult(result);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Error searching users for query: {Query}", query);
				return ApiResponse<List<UserSearchResultDto>>.ErrorResultWithCode(
					"An error occurred while searching users",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string> { ex.Message }
				);
			}
		}
	}
}
