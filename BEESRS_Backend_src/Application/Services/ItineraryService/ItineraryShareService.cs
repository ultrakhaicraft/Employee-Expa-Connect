using Application.Interfaces;
using Application.Interfaces.ItineraryService;
using AutoMapper;
using Domain.Entities;
using Domain.Enums;
using Domain.Enums.NotificationActionType;
using Infrastructure.Helper.Enum;
using Infrastructure.Interfaces;
using Infrastructure.Interfaces.Personal_Itinerary;
using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryShareDTO;
using Infrastructure.Models.NotificationDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Application.Services.ItineraryService
{
	public class ItineraryShareService : IItineraryShareService
	{
		private readonly IItineraryShareRepository _itineraryShareRepository;
		private readonly INotificationService _notificationService;
		private readonly IItineraryRepository _itineraryRepository;
		private readonly IFriendshipRepository _friendshipRepository;
		private readonly IItineraryItemRepository _itineraryItemRepository;
		private readonly IUserRepository _userRepository;
		private readonly IMapper _mapper;

		public ItineraryShareService(IItineraryShareRepository itineraryShareRepository, IItineraryRepository itineraryRepository, 
			IItineraryItemRepository itineraryItemRepository, INotificationService notificationService,
			IUserRepository userRepository, IMapper mapper, IFriendshipRepository friendshipRepository)
		{
			_itineraryShareRepository = itineraryShareRepository;
			_itineraryRepository = itineraryRepository;
			_itineraryItemRepository = itineraryItemRepository;
			_notificationService = notificationService;
			_userRepository = userRepository;
			_mapper = mapper;
			_friendshipRepository = friendshipRepository;
		}

		/// <summary>
		/// Get all available shares for a specific itinerary
		/// </summary>
		/// <param name="itineraryId"></param>
		/// <returns></returns>
		public async Task<ApiResponse<List<ItineraryShareDetailDto>>> GetSharesByItineraryIdAsync(Guid itineraryId)
		{
			try
			{
				var shares = await _itineraryShareRepository.GetSharesByItineraryIdAsync(itineraryId);

				if (!shares.Any())
					return ApiResponse<List<ItineraryShareDetailDto>>.ErrorResultWithCode(
						"No shares found for this itinerary",
						(int)ResponseCode.NotFound
					);

				
				

				List <ItineraryShareDetailDto> result = new List<ItineraryShareDetailDto>();

				foreach (var share in shares)
				{
					var sharedWithUser = await _userRepository.GetByIdAsync(share.SharedWithUserId.Value);
					if (sharedWithUser == null)
					{
						continue;
					}

					var shareDetailDto = _mapper.Map<ItineraryShareDetailDto>(share);

					result.Add(shareDetailDto);
				}

				//if result is empty
				if (result.Count==0)
				{
					return ApiResponse<List<ItineraryShareDetailDto>>.ErrorResultWithCode(
						"No result shares found for this itinerary",
						(int)ResponseCode.NotFound
					);
				}

				return ApiResponse<List<ItineraryShareDetailDto>>.SuccessResult(result, "Share list retrieved successfully");
			}
			catch (Exception e)
			{

				throw;
			}
		}

		/// <summary>
		/// Share an itinerary with another user by creating an ItineraryShare entry
		/// </summary>
		/// <param name="itineraryId"></param>
		/// <param name="request"></param>
		/// <returns></returns>
		public async Task<ApiResponse<ItineraryShareDetailDto>> ShareItineraryAsync(ItineraryShareCreateDto request, Guid itineraryId, Guid CurrentUserId)
		{
			try
			{

				var itinerary = await _itineraryRepository.GetByIdAsync(itineraryId);
				if (itinerary == null)
				{
					return ApiResponse<ItineraryShareDetailDto>.ErrorResultWithCode("Itinerary not found",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"Itinerary not found in database"
						}
					);
				}

				var userIdToSharedWith = request.SharedWithUserId.GetValueOrDefault();
				var emailToSharedWith = request.SharedWithEmail;

				//Check if the user to share with exists by email or userId
				var SharedWithUser = await _userRepository.GetByEmailAsync(emailToSharedWith);
				if (SharedWithUser == null)
				{
					SharedWithUser = await _userRepository.GetByIdAsync(userIdToSharedWith);
					if (SharedWithUser == null)
					{
						return ApiResponse<ItineraryShareDetailDto>.ErrorResultWithCode("Can't found user to share",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"Can't found the user to share in database"
						}
					);
					}
				}

				var SharedByUser = await _userRepository.GetByIdAsync(CurrentUserId);
				if (SharedByUser == null)
				{
					return ApiResponse<ItineraryShareDetailDto>.ErrorResultWithCode("Can't found user sharing",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"Can't found the user who own the Itinerary to perform Share"
						}
					);
				}

				//Check if there is an exisiting share to prevent duplicate share
				var existingShare = await _itineraryShareRepository.GetShareByItineraryIdAndUserIdAsync(itinerary.ItineraryId, SharedWithUser.UserId);
				if (existingShare != null)
				{
					return ApiResponse<ItineraryShareDetailDto>.ErrorResultWithCode("Exisiting Itinerary share",
						errorStatusCode: (int)ResponseCode.BadRequest,
						new List<string>()
						{
							"There already an exisiting itinerary share, please try again"
						}
					);
				}

				//Check if they are friends
				var friendship = await _friendshipRepository.GetFriendshipByUserIdsAsync(CurrentUserId, SharedWithUser.UserId);
				if (friendship == null)
				{
					return ApiResponse<ItineraryShareDetailDto>.ErrorResultWithCode("Can only share itinerary with friends",
						errorStatusCode: (int)ResponseCode.BadRequest,
						new List<string>()
						{
							"You can only share itinerary with your friends, not stranger"
						}
					);
				}

				if(friendship.Status != FriendshipStatus.Accepted)
				{
					return ApiResponse<ItineraryShareDetailDto>.ErrorResultWithCode("Can only share itinerary with friends",
						errorStatusCode: (int)ResponseCode.BadRequest,
						new List<string>()
						{
							"You are not friend with this user since the friendship status isn't accepted"
						}
					);
				}

				//Check if the user owns the itinerary
				if (itinerary.UserId != CurrentUserId)
				{
					return ApiResponse<ItineraryShareDetailDto>.ErrorResultWithCode("Unauthorized to share this Itinerary",
						errorStatusCode: (int)ResponseCode.Unauthorized,
						new List<string>()
						{
							 "You do not have permission to share this Itinerary"
						}
					);
				}

				var itineraryShare = _mapper.Map<ItineraryShare>(request);
				itineraryShare.ItineraryId = itinerary.ItineraryId;
				itineraryShare.SharedBy = CurrentUserId; 
				itineraryShare.SharedWithUserId= SharedWithUser.UserId;
				itineraryShare.SharedAt = DateTimeOffset.UtcNow;
				itineraryShare.ExpiresAt = DateTimeOffset.UtcNow.AddDays(30); // Default expiry 30 days

				var resultItineraryShare = await _itineraryShareRepository.CreateSingleAsync(itineraryShare);

				if (resultItineraryShare == null)
				{
					return ApiResponse<ItineraryShareDetailDto>.ErrorResultWithCode("Failed to share Itinerary",
						errorStatusCode: (int)ResponseCode.InternalServerError,
						new List<string>()
						{
							 "Unable error to save ItineraryShare"
						}
					);
				}

				var dto = _mapper.Map<ItineraryShareDetailDto>(resultItineraryShare);

				//Create Notification for user sharing and the user shared with

				
			

				await NotifyItineraryShareActionAsync(SharedByUser, SharedByUser, itinerary, share: resultItineraryShare, 
					actionType:  ItineraryActionType.EnableShare, boardcastMode: BoardcastMode.User);

				await NotifyItineraryShareActionAsync(SharedByUser, SharedWithUser, itinerary, share: resultItineraryShare,
					actionType: ItineraryActionType.ReceivedShare, boardcastMode: BoardcastMode.User);

				return ApiResponse<ItineraryShareDetailDto>.SuccessResult(dto, message: "Itinerary shared successfully");

			}
			catch (Exception e)
			{

				throw;
			}

		}

		/// <summary>
		/// Revoke a shared itinerary by deleting the ItineraryShare entry
		/// </summary>
		/// <param name="shareId"></param>
		/// <returns></returns>
		public async Task<ApiResponse<bool>> RevokeShareItineraryAsync(Guid shareId, Guid userId)
		{
			try
			{
				//Find Itinerary share
				var share = await _itineraryShareRepository.GetByIdAsync(shareId);
				if (share == null)
				{
					return ApiResponse<bool>.ErrorResultWithCode("Itinerary share not found",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"Itinerary share not found in database"
						}
					);
				}

				//Check if the user owns the itinerary share
				if (share.SharedBy != userId)
				{
					return ApiResponse<bool>.ErrorResultWithCode("Unauthorized to revoke this Itinerary share",
						errorStatusCode: (int)ResponseCode.Unauthorized,
						new List<string>()
						{
							 "You do not have permission to revoke this Itinerary share"
						}
					);
				}

				
				//Create notification
				await NotifyItineraryShareActionAsync(share.SharedByUser, share.SharedWithUser, share.Itinerary, share: share,
					actionType: ItineraryActionType.RevokeShare, boardcastMode: BoardcastMode.User);

				Console.WriteLine("Pass all check, start deleting share in repository");
				await _itineraryShareRepository.DeleteAsync(share);
				return ApiResponse<bool>.SuccessResult(true, message: "Revoke Itinerary share successfully");
			}
			catch (Exception e)
			{

				throw;
			}
		}

		public async Task<ApiResponse<List<ItineraryShareViewDto>>> GetSharedWithMeAsync(Guid userId)
		{
			var shares = await _itineraryShareRepository.GetSharedWithUserAsync(userId);

			if (!shares.Any())
				return ApiResponse<List<ItineraryShareViewDto>>.ErrorResultWithCode(
					"No itineraries shared with you",
					(int)ResponseCode.NotFound
				);

			var result = shares.Select(s => new ItineraryShareViewDto
			{
				ShareId = s.ShareId,
				ItineraryId = s.ItineraryId,
				ItineraryName = s.Itinerary?.Title,
				SharedByUserName = s.SharedByUser?.FirstName + s.SharedByUser?.LastName,
				SharedAt = s.SharedAt,
				PermissionLevel = s.PermissionLevel
			}).ToList();

			return ApiResponse<List<ItineraryShareViewDto>>.SuccessResult(result, "Shared itineraries retrieved successfully");
		}

		/// <summary>
		/// Check if a user has edit permission for a specific itinerary when being shared
		/// </summary>
		/// <param name="itineraryId"></param>
		/// <param name="userId"></param>
		/// <returns></returns>
		public async Task<ApiResponse<bool>> CheckEditPermission(Guid itineraryId, Guid userId)
		{
			try
			{

				var share = await _itineraryShareRepository.GetShareByItineraryIdAndUserIdAsync(itineraryId, userId);
				if (share == null)
				{
					return ApiResponse<bool>.ErrorResult("Itinerary Share not found");
				}

				//Check expired (Not used for now)
				/*
				if (share.ExpiresAt < DateTimeOffset.UtcNow)
				{
					return ApiResponse<bool>.ErrorResult("Itinerary Share has expired");
				}
				*/

				//Check permission level is edit
				/*
				if (share.PermissionLevel != SharePermissionLevel.Edit.ToString())
				{
					return ApiResponse<bool>.ErrorResult("You do not have edit Permission");
				}
				*/

				return ApiResponse<bool>.SuccessResult(true);
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<bool>.ErrorResult("Failed to Check itinerary owner", new List<string>()
						{
							e.Message ?? "Exception error caught during checking Itinerary owner"
						}
				);
			}
		}

		/// <summary>
		/// Check if a user has edit permission for a specific itinerary item when being shared
		/// </summary>
		/// <param name="itineraryItemId"></param>
		/// <param name="userId"></param>
		/// <returns></returns>
		public async Task<ApiResponse<bool>> CheckEditPermissionByItineraryItem(Guid itineraryItemId, Guid userId)
		{
			try
			{
				//Get ItineraryId from ItineraryItem
				var itineraryItem = await _itineraryItemRepository.GetByIdAsync(itineraryItemId);

				if (itineraryItem == null)
				{
					return ApiResponse<bool>.ErrorResultWithCode("Itinerary Item not found",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"Itinerary Item not found in database"
						}
					);
				}


				return await CheckEditPermission(itineraryItem.ItineraryId, userId);
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<bool>.ErrorResult("Failed to Check itinerary owner", new List<string>()
						{
							e.Message ?? "Exception error caught during checking Itinerary owner"
						}
				);
			}
		}


		private async Task<ApiResponse<Guid>> NotifyItineraryShareActionAsync(User user, User targetUser,
			Itinerary itinerary, ItineraryShare share,
			ItineraryActionType actionType, BoardcastMode boardcastMode,
			object? extraData = null)
		{
			Guid senderId = Guid.Empty;
			string userDisplayName = user.FullName ?? $"{user.FirstName + user.LastName}";
			Guid targetUserId = Guid.Empty;
			string targetUserDisplayName = targetUser.FullName ?? $"{targetUser.FirstName + targetUser.LastName}";
			string itineraryTitle = itinerary.Title;

			string title = string.Empty;
			string message = string.Empty;
			string notificationType = string.Empty;
			string actionTypeString = string.Empty;
			string deepLinkUrl = "";

			
			switch (actionType)
			{
				case ItineraryActionType.EnableShare:
					title = "Sent share request to your friend";
					message = $"You have shared the Itinerary '{itineraryTitle}' with {targetUserDisplayName}.";
					notificationType = "ItineraryShare";
					actionTypeString = "EnableItineraryShare";
					senderId = user.UserId;
					targetUserId = user.UserId;
					deepLinkUrl = $"/itinerary/{itinerary.ItineraryId}";
					break;

				case ItineraryActionType.ReceivedShare:
					title = "Someone want to share Itinerary with you";
					message = $"User {userDisplayName} wants to share Itinerary with you: {itineraryTitle}.";
					notificationType = "ItineraryShare";
					actionTypeString = "ReceivedItineraryShare";
					senderId = user.UserId;
					targetUserId = targetUser.UserId;
				    deepLinkUrl = $"/itinerary/{itinerary.ItineraryId}";
					break;

				case ItineraryActionType.RevokeShare:
					title = "Your Itinerary share access has been revoked";
					message = $"User {userDisplayName} has revoke your access to Itinerary: {itineraryTitle}";
					notificationType = "RevokeItineraryShare";
					actionTypeString = "RevokeItineraryShare";
					senderId = user.UserId;
					targetUserId = targetUser.UserId;
					break;
			}

			//Boardcast Message
			var messageDto = new GeneralNotificationMessage
			{
				Title = title,
				Message = message,
				SenderId = senderId,
				TargetUserId = targetUserId,
				Type = "Success"
			};


			var actionData = new
			{
				ItineraryId = itinerary.ItineraryId,				
				Extra = extraData,
				ActionAt = DateTimeOffset.UtcNow
			};

			//Notification detail
			var createDto = new CreateNotificationDto
			{
				UserId = targetUserId,
				NotificationType = notificationType,
				Title = title,
				Message = message,
				ActionType = actionTypeString,
				ActionData = JsonSerializer.Serialize(actionData),
				DeepLinkUrl = deepLinkUrl,
				DeliveryChannels = JsonSerializer.Serialize(new[] { "Web", "Push" }),
				IsRead = false,
				IsDismissed = false
			};

			//Send + Save
			return await _notificationService.NotifyAndSaveNotification(messageDto, createDto, boardcastMode);
		}
	}
}
