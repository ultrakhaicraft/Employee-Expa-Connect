using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Helper.Enum;
using Infrastructure.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Models.EventShareDTO;
using Infrastructure.Models.NotificationDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Application.Services
{
    public class EventShareService : IEventShareService
    {
        private readonly IEventShareRepository _eventShareRepository;
        private readonly INotificationService _notificationService;
        private readonly IEventRepository _eventRepository;
        private readonly IFriendshipRepository _friendshipRepository;
        private readonly IUserRepository _userRepository;
        private readonly IEmailService _emailService;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;

        public EventShareService(
            IEventShareRepository eventShareRepository,
            IEventRepository eventRepository,
            INotificationService notificationService,
            IUserRepository userRepository,
            IFriendshipRepository friendshipRepository,
            IEmailService emailService,
            Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _eventShareRepository = eventShareRepository;
            _eventRepository = eventRepository;
            _notificationService = notificationService;
            _userRepository = userRepository;
            _friendshipRepository = friendshipRepository;
            _emailService = emailService;
            _configuration = configuration;
        }

        /// <summary>
        /// Get all available shares for a specific event
        /// </summary>
        public async Task<ApiResponse<List<EventShareDetailDto>>> GetSharesByEventIdAsync(Guid eventId)
        {
            try
            {
                var shares = await _eventShareRepository.GetSharesByEventIdAsync(eventId);

                if (!shares.Any())
                    return ApiResponse<List<EventShareDetailDto>>.ErrorResultWithCode(
                        "No shares found for this event",
                        (int)ResponseCode.NotFound
                    );

                var result = shares.Select(s => new EventShareDetailDto
                {
                    ShareId = s.ShareId,
                    EventId = s.EventId,
                    SharedBy = s.SharedBy,
                    SharedByUserName = $"{s.SharedByUser?.FirstName} {s.SharedByUser?.LastName}".Trim(),
                    SharedWithUserId = s.SharedWithUserId,
                    SharedWithEmail = s.SharedWithEmail,
                    SharedWithUserName = $"{s.SharedWithUser?.FirstName} {s.SharedWithUser?.LastName}".Trim(),
                    PermissionLevel = s.PermissionLevel,
                    SharedAt = s.SharedAt,
                    ExpiresAt = s.ExpiresAt
                }).ToList();

                return ApiResponse<List<EventShareDetailDto>>.SuccessResult(result, "Share list retrieved successfully");
            }
            catch (Exception e)
            {
                Console.WriteLine(e.Message);
                Console.WriteLine(e.StackTrace);
                return ApiResponse<List<EventShareDetailDto>>.ErrorResult(
                    "Failed to get list of Event Share due to exception",
                    new List<string> { e.Message ?? "Exception error caught get Event share" }
                );
            }
        }

        /// <summary>
        /// Share an event with another user by creating an EventShare entry
        /// </summary>
        public async Task<ApiResponse<EventShareDetailDto>> ShareEventAsync(
            EventShareCreateDto request,
            Guid eventId,
            Guid currentUserId)
        {
            try
            {
                // 1. Validate event exists
                var eventEntity = await _eventRepository.GetByIdAsync(eventId);
                if (eventEntity == null)
                {
                    return ApiResponse<EventShareDetailDto>.ErrorResultWithCode(
                        "Event not found",
                        (int)ResponseCode.NotFound,
                        new List<string> { "Event not found in database" }
                    );
                }

                // 2. Check if user is organizer
                if (eventEntity.OrganizerId != currentUserId)
                {
                    return ApiResponse<EventShareDetailDto>.ErrorResultWithCode(
                        "Unauthorized to share this event",
                        (int)ResponseCode.Unauthorized,
                        new List<string> { "Only organizer can share event" }
                    );
                }

                // 3. Validate shared with user
                if (!request.SharedWithUserId.HasValue && string.IsNullOrEmpty(request.SharedWithEmail))
                {
                    return ApiResponse<EventShareDetailDto>.ErrorResultWithCode(
                        "Invalid share request",
                        (int)ResponseCode.BadRequest,
                        new List<string> { "Either SharedWithUserId or SharedWithEmail must be provided" }
                    );
                }

                Guid? userIdToShareWith = request.SharedWithUserId;
                bool isSharingViaEmail = !string.IsNullOrEmpty(request.SharedWithEmail);

                // 4. If email provided, try to find user by email (but don't require friendship for email shares)
                if (userIdToShareWith == null && isSharingViaEmail)
                {
                    var userByEmail = await _userRepository.GetByEmailAsync(request.SharedWithEmail);
                    if (userByEmail != null)
                    {
                        userIdToShareWith = userByEmail.UserId;
                    }
                    // If user not found by email, allow sharing with email anyway (can share with anyone via email)
                }

                // 5. Check friendship ONLY if sharing directly with userId (not via email)
                // When sharing via email, allow sharing with anyone regardless of friendship status
                if (userIdToShareWith.HasValue && !isSharingViaEmail)
                {
                    // Sharing directly with userId (not via email) - requires friendship
                    var sharedWithUser = await _userRepository.GetByIdAsync(userIdToShareWith.Value);
                    if (sharedWithUser == null)
                    {
                        return ApiResponse<EventShareDetailDto>.ErrorResultWithCode(
                            "User not found",
                            (int)ResponseCode.NotFound,
                            new List<string> { "Can't find the user to share with in database" }
                        );
                    }

                    // Check if they are friends (required when sharing directly with userId)
                    var friendship = await _friendshipRepository.GetFriendshipByUserIdsAsync(
                        currentUserId,
                        userIdToShareWith.Value);

                    if (friendship == null || friendship.Status != FriendshipStatus.Accepted)
                    {
                        return ApiResponse<EventShareDetailDto>.ErrorResultWithCode(
                            "Can only share event with friends",
                            (int)ResponseCode.BadRequest,
                            new List<string> { "You can only share event with your friends" }
                        );
                    }

                    // 6. Check if already shared with this user
                    var existingShare = await _eventShareRepository.GetShareByEventIdAndUserIdAsync(
                        eventId,
                        userIdToShareWith.Value);

                    if (existingShare != null)
                    {
                        return ApiResponse<EventShareDetailDto>.ErrorResultWithCode(
                            "Event already shared with this user",
                            (int)ResponseCode.BadRequest,
                            new List<string> { "Event has already been shared with this user" }
                        );
                    }
                }
                else if (isSharingViaEmail)
                {
                    // 6b. Check if already shared with this email (for email shares - both registered and non-registered users)
                    var existingEmailShare = (await _eventShareRepository.GetSharesByEventIdAsync(eventId))
                        .FirstOrDefault(s => !string.IsNullOrEmpty(s.SharedWithEmail) && 
                                            s.SharedWithEmail.Equals(request.SharedWithEmail, StringComparison.OrdinalIgnoreCase));

                    if (existingEmailShare != null)
                    {
                        return ApiResponse<EventShareDetailDto>.ErrorResultWithCode(
                            "Event already shared with this email",
                            (int)ResponseCode.BadRequest,
                            new List<string> { "Event has already been shared with this email address" }
                        );
                    }
                }
                else if (userIdToShareWith.HasValue)
                {
                    // 6c. If userId provided but no email, check if already shared
                    var existingShare = await _eventShareRepository.GetShareByEventIdAndUserIdAsync(
                        eventId,
                        userIdToShareWith.Value);

                    if (existingShare != null)
                    {
                        return ApiResponse<EventShareDetailDto>.ErrorResultWithCode(
                            "Event already shared with this user",
                            (int)ResponseCode.BadRequest,
                            new List<string> { "Event has already been shared with this user" }
                        );
                    }
                }

                // 7. Create EventShare
                var eventShare = new EventShare
                {
                    EventId = eventId,
                    SharedWithUserId = userIdToShareWith,
                    SharedWithEmail = request.SharedWithEmail ?? string.Empty,
                    PermissionLevel = request.PermissionLevel ?? "View",
                    ExpiresAt = request.ExpiresAt ?? DateTimeOffset.UtcNow.AddDays(30),
                    SharedBy = currentUserId,
                    SharedAt = DateTimeOffset.UtcNow
                };

                var resultEventShare = await _eventShareRepository.CreateSingleAsync(eventShare);

                if (resultEventShare == null)
                {
                    return ApiResponse<EventShareDetailDto>.ErrorResultWithCode(
                        "Failed to share event",
                        (int)ResponseCode.InternalServerError,
                        new List<string> { "Unable to save EventShare" }
                    );
                }

                // 8. Create DTO
                var sharedByUser = await _userRepository.GetByIdAsync(currentUserId);
                Domain.Entities.User? sharedWithUserForDto = null;
                if (userIdToShareWith.HasValue)
                {
                    sharedWithUserForDto = await _userRepository.GetByIdAsync(userIdToShareWith.Value);
                }

                var dto = new EventShareDetailDto
                {
                    ShareId = resultEventShare.ShareId,
                    EventId = resultEventShare.EventId,
                    SharedBy = resultEventShare.SharedBy,
                    SharedByUserName = $"{sharedByUser?.FirstName} {sharedByUser?.LastName}".Trim(),
                    SharedWithUserId = resultEventShare.SharedWithUserId,
                    SharedWithEmail = resultEventShare.SharedWithEmail,
                    SharedWithUserName = sharedWithUserForDto != null
                        ? $"{sharedWithUserForDto.FirstName} {sharedWithUserForDto.LastName}".Trim()
                        : string.Empty,
                    PermissionLevel = resultEventShare.PermissionLevel,
                    SharedAt = resultEventShare.SharedAt,
                    ExpiresAt = resultEventShare.ExpiresAt
                };

                // 9. Create notifications
                var userDisplayName = $"{sharedByUser?.FirstName} {sharedByUser?.LastName}".Trim();
                
                if (userIdToShareWith.HasValue)
                {
                    var friendDisplayName = $"{sharedWithUserForDto?.FirstName} {sharedWithUserForDto?.LastName}".Trim();

                    var receiverMessage = new GeneralNotificationMessage
                    {
                        Title = "Event shared with you",
                        Message = $"{userDisplayName} shared event '{eventEntity.Title}' with you",
                        Type = NotificationMessageType.DataCreated.ToString(),
                        SenderId = currentUserId,
                        TargetUserId = userIdToShareWith.Value
                    };

                    await _notificationService.BoardcastToSpecificUserByIdAsync(receiverMessage);

                    var senderMessage = new GeneralNotificationMessage
                    {
                        Title = "Event shared successfully",
                        Message = $"You have shared event '{eventEntity.Title}' with {friendDisplayName}",
                        Type = NotificationMessageType.DataCreated.ToString(),
                        SenderId = currentUserId,
                        TargetUserId = currentUserId
                    };

                    await _notificationService.BoardcastToSpecificUserByIdAsync(senderMessage);
                }

                // 10. Send email if shared via email (for any email, not just registered users)
                if (!string.IsNullOrEmpty(request.SharedWithEmail))
                {
                    try
                    {
                        // Generate share link
                        var frontendUrl = _configuration["FrontendUrl"] ?? _configuration["AppSettings:FrontendUrl"] ?? "http://localhost:3000";
                        var shareLink = $"{frontendUrl}/user/events/{eventId}";

                        // Send email with event details
                        await _emailService.SendEventShareEmailAsync(
                            request.SharedWithEmail,
                            eventEntity,
                            userDisplayName,
                            shareLink);
                    }
                    catch (Exception emailEx)
                    {
                        // Log email error but don't fail the share operation
                        Console.WriteLine($"Error sending share email: {emailEx.Message}");
                        Console.WriteLine(emailEx.StackTrace);
                    }
                }

                return ApiResponse<EventShareDetailDto>.SuccessResult(dto, "Event shared successfully");
            }
            catch (Exception e)
            {
                Console.WriteLine(e.Message);
                Console.WriteLine(e.StackTrace);
                return ApiResponse<EventShareDetailDto>.ErrorResult(
                    "Failed to share event due to exception",
                    new List<string> { e.Message ?? "Exception error caught sharing event" }
                );
            }
        }

        /// <summary>
        /// Revoke a shared event by deleting the EventShare entry
        /// </summary>
        public async Task<ApiResponse<bool>> RevokeShareEventAsync(Guid shareId, Guid userId)
        {
            try
            {
                var share = await _eventShareRepository.GetByIdAsync(shareId);
                if (share == null)
                {
                    return ApiResponse<bool>.ErrorResultWithCode(
                        "Event share not found",
                        (int)ResponseCode.NotFound,
                        new List<string> { "Event share not found in database" }
                    );
                }

                // Check if the user owns the event share (is the organizer)
                var eventEntity = await _eventRepository.GetByIdAsync(share.EventId);
                if (eventEntity == null || eventEntity.OrganizerId != userId)
                {
                    return ApiResponse<bool>.ErrorResultWithCode(
                        "Unauthorized to revoke this event share",
                        (int)ResponseCode.Unauthorized,
                        new List<string> { "Only organizer can revoke event share" }
                    );
                }

                await _eventShareRepository.DeleteAsync(share);
                return ApiResponse<bool>.SuccessResult(true, "Event share revoked successfully");
            }
            catch (Exception e)
            {
                Console.WriteLine(e.Message);
                Console.WriteLine(e.StackTrace);
                return ApiResponse<bool>.ErrorResult(
                    "Failed to revoke event share",
                    new List<string> { e.Message ?? "Exception error caught revoking event share" }
                );
            }
        }

        /// <summary>
        /// Get all events shared with the current user
        /// </summary>
        public async Task<ApiResponse<List<EventShareViewDto>>> GetSharedWithMeAsync(Guid userId)
        {
            try
            {
                var shares = await _eventShareRepository.GetSharedWithUserAsync(userId);

                if (!shares.Any())
                    return ApiResponse<List<EventShareViewDto>>.ErrorResultWithCode(
                        "No events shared with you",
                        (int)ResponseCode.NotFound
                    );

                var result = shares.Select(s => new EventShareViewDto
                {
                    ShareId = s.ShareId,
                    EventId = s.EventId,
                    EventTitle = s.Event?.Title ?? "Unknown Event",
                    SharedByUserName = $"{s.SharedByUser?.FirstName} {s.SharedByUser?.LastName}".Trim(),
                    SharedAt = s.SharedAt,
                    PermissionLevel = s.PermissionLevel
                }).ToList();

                return ApiResponse<List<EventShareViewDto>>.SuccessResult(
                    result,
                    "Shared events retrieved successfully"
                );
            }
            catch (Exception e)
            {
                Console.WriteLine(e.Message);
                Console.WriteLine(e.StackTrace);
                return ApiResponse<List<EventShareViewDto>>.ErrorResult(
                    "Failed to get shared events",
                    new List<string> { e.Message ?? "Exception error caught getting shared events" }
                );
            }
        }
    }
}



