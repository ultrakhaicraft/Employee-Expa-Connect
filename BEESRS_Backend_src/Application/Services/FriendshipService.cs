using Application.Interfaces;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using Azure.Core;
using Domain.Entities;
using Domain.Enums;
using Domain.Enums.NotificationActionType;
using Infrastructure.Helper;
using Infrastructure.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Models.NotificationDTO;
using Infrastructure.Models.PlaceDTO;
using Infrastructure.Models.PlaceReview;
using Infrastructure.Models.UserDTO;
using Infrastructure.Models.UserProfileDTO;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Application.Services
{
    public class FriendshipService : IFriendshipService
    {
        private readonly IFriendshipRepository _friendshipRepository;
        private readonly IUserRepository _userRepository;
		private readonly INotificationService _notificationService;
		private readonly IMapper _mapper;

		public FriendshipService(IFriendshipRepository friendshipRepository, IUserRepository userRepository, INotificationService notificationService, IMapper mapper)
		{
			_friendshipRepository = friendshipRepository;
			_userRepository = userRepository;
			_notificationService = notificationService;
			_mapper = mapper;
		}

		public async Task AcceptFriendRequestAsync(Guid receiverId, Guid friendshipId)
        {
            var existingRequest = await _friendshipRepository.GetFriendshipByIdAsync(friendshipId);
            if (existingRequest == null || existingRequest.Status != FriendshipStatus.Pending)
                throw new InvalidOperationException("Invalid friend request.");

            if(existingRequest.AddresseeId != receiverId)
                throw new UnauthorizedAccessException("You are not authorized to accept this friend request.");

            var result = await _friendshipRepository.AcceptFriendRequestAsync(friendshipId);
            if (result == 0)
                throw new Exception("Failed to accept friend request.");

			var requester = await _userRepository.GetByIdAsync(existingRequest.RequestedId);
			if (requester == null)
				throw new KeyNotFoundException($"Cannot found requester account with id: {existingRequest.RequestedId}");
			var receiver = await _userRepository.GetByIdAsync(existingRequest.AddresseeId);
			if (receiver == null)

				await NotifyFriendshipActionAsync(existingRequest.Requested, existingRequest.Addressee, existingRequest
				, FriendshipActionType.Accepted, boardcastMode: BoardcastMode.User);

		}

        public async Task DeclineFriendRequestAsync(Guid receiverId, Guid friendshipId)
        {
            var existingRequest = await _friendshipRepository.GetFriendshipByIdAsync(friendshipId);
            if (existingRequest == null || existingRequest.Status != FriendshipStatus.Pending)
                throw new InvalidOperationException("Invalid friend request.");

            if (existingRequest.AddresseeId != receiverId)
                throw new UnauthorizedAccessException("You are not authorized to decline this friend request.");

            var result = await  _friendshipRepository.DeclineFriendRequestAsync(friendshipId);
            if (result == 0)
                throw new Exception("Failed to decline friend request.");

			var requester = await _userRepository.GetByIdAsync(existingRequest.RequestedId);
			if (requester == null)
				throw new KeyNotFoundException($"Cannot found requester account with id: {existingRequest.RequestedId}");
			var receiver = await _userRepository.GetByIdAsync(existingRequest.AddresseeId);
			if (receiver == null)
				throw new KeyNotFoundException($"Cannot found receiver account with id: {existingRequest.AddresseeId}");

			await NotifyFriendshipActionAsync(requester, receiver, existingRequest
				, FriendshipActionType.Declined, boardcastMode: BoardcastMode.User);
		}

        public async Task<IEnumerable<FriendRequest>> GetPendingFriendRequestsAsync(Guid userId)
        {
            var requests = await  _friendshipRepository.GetPendingRequestsAsync(userId);
            return _mapper.Map<IEnumerable<FriendRequest>>(requests);
        }

        public async Task RemoveFriendAsync(Guid userId, Guid friendId)
        {
			var user = await _userRepository.GetByIdAsync(userId);

			if (user == null)
				throw new KeyNotFoundException($"Cannot found your account with id: {userId}");
			var userAsFriend = await _userRepository.GetByIdAsync(friendId);

			if (userAsFriend == null)
				throw new KeyNotFoundException($"Cannot found friend account with id: {friendId}");
			var query = _friendshipRepository.GetFriendsListAsync(userId);
            var friends = await query.ToListAsync();
            var friendList = _mapper.Map<List<FriendList>>(friends, opts =>
            {
                opts.Items["UserId"] = userId;
            });

            if (!friendList.Any(f => (f.UserId == friendId)))
                throw new InvalidOperationException("This user is not your friend.");

			var friendship = await _friendshipRepository.GetFriendshipByUserIdsAsync(userId, friendId);

            var result = await _friendshipRepository.RemoveFriendAsync(userId, friendId);
            if (result == 0)
                throw new Exception("Failed to remove friend.");

			

			await NotifyFriendshipActionAsync(user, userAsFriend, friendship
				, FriendshipActionType.Blocked, boardcastMode: BoardcastMode.User);
		}

        public async Task SendFriendRequestAsync(Guid senderId, Guid receiverId)
        {
            var request = await _friendshipRepository.GetFriendshipByUserIdsAsync(senderId, receiverId);

			var sender = await _userRepository.GetByIdAsync(senderId);
			if(sender == null)
				throw new KeyNotFoundException($"Cannot found sender account with id: {senderId}");

			var receiver = await _userRepository.GetByIdAsync(receiverId);
			if (receiver == null)
				throw new KeyNotFoundException($"Cannot found receiver account with id: {receiverId}");

			if (request != null && request.Status == FriendshipStatus.Pending)
                throw new InvalidOperationException("Your request already has been sent.");

            if (request != null && request.Status == FriendshipStatus.Accepted)
                throw new InvalidOperationException("You are already friends with this user.");

            if (request != null && request.Status == FriendshipStatus.Blocked)
			{
				await NotifyFriendshipActionAsync(sender, receiver, request
				, FriendshipActionType.Blocked, boardcastMode: BoardcastMode.User);

				throw new InvalidOperationException("You have been blocked by this user.");
			}
               
            if (senderId == receiverId)
                throw new ArgumentException("You cannot send a friend request to yourself.");

            var result = await  _friendshipRepository.SendFriendRequestAsync(senderId, receiverId);
            if (result == 0)
                throw new Exception("Failed to send friend request.");

			var friendship = await _friendshipRepository.GetFriendshipByUserIdsAsync(senderId, receiverId);

			await NotifyFriendshipActionAsync(sender, receiver, friendship
				, FriendshipActionType.Sent, boardcastMode: BoardcastMode.User);
		}

        public async Task<PagedResult<FriendList>> GetFriendsListAsync(Guid userId, OnlyPageRequest req)
        {
            var query = _friendshipRepository.GetFriendsListAsync(userId);

            var totalCount = await query.CountAsync();

            var friendships = await query
                .OrderBy(f => f.CreatedAt)
                .Skip((req.Page - 1) * req.PageSize)
                .Take(req.PageSize)
                .ToListAsync();

            var friendList = _mapper.Map<List<FriendList>>(friendships, opts =>
            {
                opts.Items["UserId"] = userId;
            });

            return new PagedResult<FriendList> (
                req.Page,
                req.PageSize,
                totalCount,
                friendList
                );
        }

        public async Task<PagedResult<FriendSuggestion>> GetAllUserInBranchUserMayKnowAsync(Guid userId, OnlyPageRequest req)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new KeyNotFoundException($"Cannot found your account with id: {userId}");

			var branchId = user.CurrentBranchId;
            var query = _friendshipRepository.GetAllUserInBranchUserMayKnow(userId, branchId);
            var pagedResult = await PageConverter<FriendSuggestion>.ToPagedResultAsync(
                req.Page, req.PageSize, query.Count(), query.ProjectTo<FriendSuggestion>(_mapper.ConfigurationProvider));
            return pagedResult;
        }


		private async Task<ApiResponse<Guid>> NotifyFriendshipActionAsync(User requester, User addressee,
			Friendship? friendship,
			FriendshipActionType actionType, BoardcastMode boardcastMode,
			object? extraData = null)
		{
			Guid senderId = Guid.Empty;
			string userDisplayName = requester.FullName;
			Guid targetUserId = Guid.Empty;
			string targetUserDisplayName = addressee.FullName;
			

			string title = string.Empty;
			string message = string.Empty;
			string notificationType = string.Empty;
			string actionTypeString = string.Empty;
			string deepLinkUrl = string.Empty;


			switch (actionType)
			{
				case FriendshipActionType.Sent:
					title = "Someone want to friend with you";
					message = $"{userDisplayName} Just sent a friend request to you, please response ";
					notificationType = "Friendship";
					actionTypeString = "FriendRequestSent";
					senderId = requester.UserId;
					targetUserId = addressee.UserId;
					deepLinkUrl = $"/friends"; //View friendships page
					break;

				case FriendshipActionType.Accepted:
					title = "Your friend request just got accepted";
					message = $"Your friend request with {targetUserDisplayName} just got accepted by them";
					notificationType = "Friendship";
					actionTypeString = "FriendRequestAccepted";
					senderId = addressee.UserId;
					targetUserId = requester.UserId;
					deepLinkUrl= $"/view-other-profile/{addressee.UserId}"; //View friend's profile
					break;

				case FriendshipActionType.Declined:
					title = "Your friend request just got declined";
					message = $"Your friend request with {targetUserDisplayName} just got declined by them";
					notificationType = "Friendship";
					actionTypeString = "FriendRequestDeclined";
					senderId = addressee.UserId;
					targetUserId = requester.UserId;
					deepLinkUrl = $"/view-other-profile/{addressee.UserId}"; //View friend's profile
					break;

				case FriendshipActionType.Blocked:
					title = "Your friend request has been blocked";
					message = $"Unfortunately, the user  {targetUserDisplayName} whom you want to sent friend request has blocked you";
					notificationType = "Friendship";
					actionTypeString = "FriendRequestBlocked";
					senderId = addressee.UserId;
					targetUserId = requester.UserId;
					deepLinkUrl = $"/view-other-profile/{addressee.UserId}"; //View friend's profile
					break;

				case FriendshipActionType.Removed:
					title = "Your friend has remove you from friend list";
					message = $"Unfortunately,the user {targetUserDisplayName} has remove you from their friend list ";
					notificationType = "Friendship";
					actionTypeString = "FriendRequestBlocked";
					senderId = requester.UserId; //The person who perform the remove
					targetUserId = addressee.UserId; //The person who got removed
					deepLinkUrl = $"/view-other-profile/{addressee.UserId}"; //View friend's profile
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
				FriendshipId = friendship.FriendshipId,
                RequesterId = requester.UserId,
                AddresseeId = addressee.UserId,
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

        public async Task<PagedResult<UserProfileViewDto>> GetAllUserProfileInBranchUserMayKnowAsync(Guid userId, OnlyPageRequest req)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new KeyNotFoundException($"Cannot found your account with id: {userId}");

            var branchId = user.CurrentBranchId;
            var query = _userRepository.GetOthersEmployeeInBranch(userId, branchId);

            var totalCount = await query.CountAsync();

            var users = await query.Skip((req.Page - 1) * req.PageSize)
                               .Take(req.PageSize)
                               .ToListAsync();

			var pagedResult = new PagedResult<UserProfileViewDto>(req.Page, req.PageSize, totalCount, _mapper.Map<List<UserProfileViewDto>>(users)); 

			foreach (var employee in pagedResult.Items)
			{
				var friendship = await _friendshipRepository.GetFriendshipByUserIdsAsync(userId, employee.UserId);
                if (friendship == null)
                {
                    employee.FriendshipStatus = "Not friend";
					continue;
                }

                switch (friendship.Status)
				{
                    case FriendshipStatus.Pending:
                        employee.FriendshipStatus = "Pending";
                        break;
                    case FriendshipStatus.Accepted:
                        employee.FriendshipStatus = "Friend";
                        break;
                    case FriendshipStatus.Rejected:
                        employee.FriendshipStatus = "Not friend";
                        break;
                }
            }
                return pagedResult;
        }
    }
}
