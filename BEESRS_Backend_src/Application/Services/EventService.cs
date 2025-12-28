using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Application.Exceptions;
using Application.Interfaces;
using Application.Interfaces.ThirdParty;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Helper.Enum;
using Infrastructure.Interfaces;
using Infrastructure.Interfaces.ConversationsInterface;
using Infrastructure.Interfaces.IPlaceRepos;
using Infrastructure.Models.Common;
using Infrastructure.Models.Converstation;
using Infrastructure.Models.NotificationDTO;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Application.Services
{
    public class EventService : IEventService
    {
        private readonly IEventRepository _eventRepository;
        private readonly IEventParticipantRepository _participantRepository;
        private readonly IEventStateMachine _stateMachine;
        private readonly INotificationService _notificationService;
        private readonly IUserRepository _userRepository;
        private readonly IEventPlaceOptionRepository _optionRepository;
        private readonly IEmailService _emailService;
        private readonly IConverstationService _conversationService;
        private readonly IConversationRepository _conversationRepository;
        private readonly IEventCheckInRepository _checkInRepository;
        private readonly IEventFeedbackRepository _feedbackRepository;
        private readonly IAuditLogService _auditLogService;
        private readonly IEventTemplateRepository _templateRepository;
        private readonly IRecurringEventRepository _recurringEventRepository;
        private readonly IEventWaitlistRepository _waitlistRepository;
        private readonly ICloudinaryHelper _cloudinaryHelper;
        private readonly IPlaceRepository _placeRepository;
        private readonly IUserProfileRepository _userProfileRepository;
        private readonly ILogger<EventService> _logger;

        public EventService(
            IEventRepository eventRepository,
            IEventParticipantRepository participantRepository,
            IEventStateMachine stateMachine,
            INotificationService notificationService,
            IUserRepository userRepository,
            IEventPlaceOptionRepository optionRepository,
            IEmailService emailService,
            IConverstationService conversationService,
            IConversationRepository conversationRepository,
            IEventCheckInRepository checkInRepository,
            IEventFeedbackRepository feedbackRepository,
            IAuditLogService auditLogService,
            IEventTemplateRepository templateRepository,
            IRecurringEventRepository recurringEventRepository,
            IEventWaitlistRepository waitlistRepository,
            ICloudinaryHelper cloudinaryHelper,
            IPlaceRepository placeRepository,
            IUserProfileRepository userProfileRepository,
            ILogger<EventService> logger)
        {
            _eventRepository = eventRepository;
            _participantRepository = participantRepository;
            _stateMachine = stateMachine;
            _notificationService = notificationService;
            _userRepository = userRepository;
            _optionRepository = optionRepository;
            _emailService = emailService;
            _conversationService = conversationService;
            _conversationRepository = conversationRepository;
            _checkInRepository = checkInRepository;
            _feedbackRepository = feedbackRepository;
            _auditLogService = auditLogService;
            _templateRepository = templateRepository;
            _recurringEventRepository = recurringEventRepository;
            _waitlistRepository = waitlistRepository;
            _cloudinaryHelper = cloudinaryHelper;
            _placeRepository = placeRepository;
            _userProfileRepository = userProfileRepository;
            _logger = logger;
        }

        /// <summary>
        /// Convert date and time from user's timezone to UTC
        /// </summary>
        private (DateTime utcDate, TimeSpan utcTime) ConvertToUtc(DateTime localDate, TimeSpan localTime, string userTimezone)
        {
            try
            {
                // Parse timezone offset (e.g., "UTC+07:00" or "UTC-05:00")
                TimeSpan offset = TimeSpan.Zero;
                if (!string.IsNullOrEmpty(userTimezone) && userTimezone.StartsWith("UTC", StringComparison.OrdinalIgnoreCase))
                {
                    var offsetStr = userTimezone.Substring(3); // Remove "UTC" prefix
                    if (TimeSpan.TryParse(offsetStr, out var parsedOffset))
                    {
                        offset = parsedOffset;
                    }
                    else
                    {
                        _logger.LogWarning($"Failed to parse timezone offset from '{userTimezone}', using UTC+07:00 as default");
                        offset = TimeSpan.FromHours(7); // Default to UTC+07:00 for Vietnam
                    }
                }
                else if (string.IsNullOrEmpty(userTimezone))
                {
                    _logger.LogWarning($"Timezone is null or empty, using UTC+07:00 as default");
                    offset = TimeSpan.FromHours(7); // Default to UTC+07:00 for Vietnam
                }

                // Manual conversion: subtract offset from local time to get UTC
                // Example: 12:00 UTC+07:00 -> 12:00 - 07:00 = 05:00 UTC
                // Example: 11:00 UTC-05:00 -> 11:00 - (-05:00) = 11:00 + 05:00 = 16:00 UTC
                var localDateTime = localDate.Date.Add(localTime);
                
                _logger.LogInformation($"ConvertToUtc: Input - LocalDateTime={localDateTime:yyyy-MM-dd HH:mm:ss}, Timezone={userTimezone}, ParsedOffset={offset}");
                
                // Subtract offset to get UTC time
                // For UTC+07:00, offset is +07:00, so we subtract it
                // For UTC-05:00, offset is -05:00, so we subtract it (which means adding 5 hours)
                var utcDateTime = localDateTime.Subtract(offset);

                _logger.LogInformation($"ConvertToUtc: Output - UTC DateTime={utcDateTime:yyyy-MM-dd HH:mm:ss}, UTC Date={utcDateTime.Date:yyyy-MM-dd}, UTC Time={utcDateTime.TimeOfDay}");

                return (utcDateTime.Date, utcDateTime.TimeOfDay);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to convert timezone from {userTimezone}, using UTC+07:00 default and converting");
                // Fallback: assume UTC+07:00 and convert
                try
                {
                    var localDateTime = localDate.Date.Add(localTime);
                    var defaultOffset = TimeSpan.FromHours(7);
                    var utcDateTime = localDateTime.Subtract(defaultOffset);
                    return (utcDateTime.Date, utcDateTime.TimeOfDay);
                }
                catch
                {
                    // Last resort: return as-is (should not happen)
                    return (localDate, localTime);
                }
            }
        }

        public async Task<Event> CreateEventAsync(Guid organizerId, Event eventEntity)
        {
            // Get user profile to get timezone
            var userProfile = await _userProfileRepository.GetByUserIdAsync(organizerId);
            var userTimezone = userProfile?.Timezone ?? "UTC+07:00"; // Default to UTC+07:00 for Vietnam

            _logger.LogInformation($"CreateEvent: OrganizerId={organizerId}, UserTimezone={userTimezone}, InputTime={eventEntity.ScheduledTime}, InputDate={eventEntity.ScheduledDate:yyyy-MM-dd}");

            // Convert scheduled date and time from user's timezone to UTC
            var (utcDate, utcTime) = ConvertToUtc(eventEntity.ScheduledDate, eventEntity.ScheduledTime, userTimezone);
            
            _logger.LogInformation($"CreateEvent: After conversion - UTC Time={utcTime}, UTC Date={utcDate:yyyy-MM-dd}");
            
            eventEntity.ScheduledDate = utcDate;
            eventEntity.ScheduledTime = utcTime;
            eventEntity.Timezone = userTimezone; // Store user's timezone for reference

            // Set default RSVP deadline if not provided (e.g., 24 hours before event starts)
            if (!eventEntity.RsvpDeadline.HasValue)
            {
                var eventStart = eventEntity.ScheduledDate.Date.Add(eventEntity.ScheduledTime);
                eventEntity.RsvpDeadline = new DateTimeOffset(eventStart).AddDays(-1);
            }

            // Validate business rules (after UTC conversion)
            EventBusinessRules.ValidateMinimumAdvanceScheduling(eventEntity);
            EventBusinessRules.ValidateMinimumParticipants(eventEntity);
            EventBusinessRules.ValidateBudget(eventEntity);
            EventBusinessRules.ValidateInvitationDeadline(eventEntity);

            // Check for overlapping events (using UTC times)
            var overlappingEvents = await _eventRepository.GetOverlappingEventsAsync(
                organizerId,
                eventEntity.ScheduledDate,
                eventEntity.ScheduledTime,
                eventEntity.EstimatedDuration
            );
            EventBusinessRules.ValidateNoTimeOverlap(overlappingEvents, eventEntity);

            eventEntity.OrganizerId = organizerId;
            eventEntity.CreatedAt = DateTimeOffset.Now;
            eventEntity.UpdatedAt = DateTimeOffset.Now;

            // Option 1: Normal flow (AI recommendation + voting)
            // Option 2: Organizer selects place directly (skip voting)
            if (eventEntity.FinalPlaceId.HasValue)
            {
                // Validate place exists and is approved
                var place = await _placeRepository.GetByIdAsync(eventEntity.FinalPlaceId.Value, organizerId);
                if (place == null)
                    throw new NotFoundException("Selected place not found");

                if (place.IsDeleted)
                    throw new InvalidOperationException("Cannot use a deleted place for the event");

                if (place.VerificationStatus != Domain.Enums.PlaceVerificationStatus.Approved)
                {
                    var statusMessage = place.VerificationStatus == Domain.Enums.PlaceVerificationStatus.Pending
                        ? "Selected place is pending moderator approval and cannot be used yet."
                        : "Selected place has been rejected and cannot be used for the event.";
                    throw new InvalidOperationException(statusMessage);
                }

                // Auto-set timezone from place location
                try
                {
                    if (place?.Branch?.Country != null && !string.IsNullOrEmpty(place.Branch.Country.TimeZone))
                    {
                        eventEntity.Timezone = place.Branch.Country.TimeZone;
                        _logger.LogInformation($"Auto-set event timezone to {eventEntity.Timezone} from selected place location");
                    }
                    else if (!string.IsNullOrEmpty(place?.City))
                    {
                        var cityName = place.City.ToLower();
                        if (cityName.Contains("ho chi minh") || cityName.Contains("hồ chí minh") || cityName.Contains("saigon"))
                        {
                            eventEntity.Timezone = "UTC+07:00";
                        }
                        else if (cityName.Contains("hanoi") || cityName.Contains("hà nội"))
                        {
                            eventEntity.Timezone = "UTC+07:00";
                        }
                        else if (cityName.Contains("new york"))
                        {
                            eventEntity.Timezone = "UTC-05:00"; // EST (UTC-5) or EDT (UTC-4), using EST as default
                        }
                        else if (cityName.Contains("london"))
                        {
                            eventEntity.Timezone = "UTC+00:00"; // GMT/UTC
                        }
                        else if (cityName.Contains("tokyo"))
                        {
                            eventEntity.Timezone = "UTC+09:00";
                        }
                        else if (cityName.Contains("singapore"))
                        {
                            eventEntity.Timezone = "UTC+08:00";
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, $"Failed to auto-set timezone from place location for event");
                }

                // Create event with inviting status instead of confirmed
                // This allows the organizer to invite participants and wait for their acceptance
                // even if the venue is already chosen.
                eventEntity.Status = "inviting";
            }
            else
            {
                // Normal flow: start with draft status (which will transition to inviting)
                eventEntity.Status = "draft";
            }

            var createdEvent = await _eventRepository.CreateAsync(eventEntity);

            // If place was selected directly, create a place option for record keeping
            if (createdEvent.FinalPlaceId.HasValue)
            {
                var placeOption = new EventPlaceOption
                {
                    EventId = createdEvent.EventId,
                    PlaceId = createdEvent.FinalPlaceId.Value,
                    SuggestedBy = "organizer",
                    AddedAt = DateTimeOffset.Now,
                    AiReasoning = "Selected directly by organizer during event creation",
                    Pros = "[]",
                    Cons = "[]",
                    AiScore = null,
                    EstimatedCostPerPerson = null,
                    AvailabilityConfirmed = false
                };
                await _optionRepository.CreateAsync(placeOption);

                // Log audit for direct transition to confirmed (bypassing normal flow)
                await _auditLogService.LogStateTransitionAsync(
                    createdEvent.EventId,
                    "draft",
                    "confirmed",
                    "Event created with place selected directly by organizer, skipping AI recommendation and voting flow");
            }

            // Automatically add organizer as a participant with "accepted" status
            var organizerParticipant = new EventParticipant
            {
                EventId = createdEvent.EventId,
                UserId = organizerId,
                InvitationStatus = "accepted", // Organizer is automatically accepted
                InvitedAt = DateTimeOffset.Now,
                InvitedBy = organizerId, // Organizer invites themselves
                RsvpDate = DateTimeOffset.Now, // Auto-accept
                AdditionalNotes = string.Empty
            };

            await _participantRepository.CreateAsync(organizerParticipant);

            return createdEvent;
        }

        public async Task<Event> UpdateEventAsync(Guid eventId, Event updatedEvent)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            // Get user profile to get timezone
            var userProfile = await _userProfileRepository.GetByUserIdAsync(eventEntity.OrganizerId);
            var userTimezone = userProfile?.Timezone ?? eventEntity.Timezone ?? "UTC+00:00";

            // Convert scheduled date and time from user's timezone to UTC
            var (utcDate, utcTime) = ConvertToUtc(updatedEvent.ScheduledDate, updatedEvent.ScheduledTime, userTimezone);
            updatedEvent.ScheduledDate = utcDate;
            updatedEvent.ScheduledTime = utcTime;
            updatedEvent.Timezone = userTimezone; // Store user's timezone for reference

            // Validate business rules (after UTC conversion)
            EventBusinessRules.ValidateMinimumAdvanceScheduling(updatedEvent);
            EventBusinessRules.ValidateMinimumParticipants(updatedEvent);
            EventBusinessRules.ValidateBudget(updatedEvent);
            EventBusinessRules.ValidateInvitationDeadline(updatedEvent);

            // Check for overlapping events (exclude current event)
            var overlappingEvents = await _eventRepository.GetOverlappingEventsAsync(
                eventEntity.OrganizerId,
                updatedEvent.ScheduledDate,
                updatedEvent.ScheduledTime,
                updatedEvent.EstimatedDuration,
                eventId // Exclude current event from overlap check
            );
            EventBusinessRules.ValidateNoTimeOverlap(overlappingEvents, updatedEvent);

            // Update fields
            eventEntity.Title = updatedEvent.Title;
            eventEntity.Description = updatedEvent.Description;
            eventEntity.EventType = updatedEvent.EventType;
            eventEntity.ScheduledDate = updatedEvent.ScheduledDate;
            eventEntity.ScheduledTime = updatedEvent.ScheduledTime;
            eventEntity.ExpectedAttendees = updatedEvent.ExpectedAttendees;
            eventEntity.BudgetTotal = updatedEvent.BudgetTotal;
            eventEntity.BudgetPerPerson = updatedEvent.BudgetPerPerson;
            eventEntity.EstimatedDuration = updatedEvent.EstimatedDuration;
            if (!string.IsNullOrEmpty(updatedEvent.EventImageUrl))
            {
                eventEntity.EventImageUrl = updatedEvent.EventImageUrl;
            }
            eventEntity.UpdatedAt = DateTimeOffset.Now;

            // Transition to planning if still in draft
            if (eventEntity.Status == "draft")
            {
                await _stateMachine.TransitionToAsync(eventEntity, "planning");
            }

            await _eventRepository.UpdateAsync(eventEntity);
            return eventEntity;
        }

        public async Task<Event> GetEventByIdAsync(Guid eventId)
        {
            var eventEntity = await _eventRepository.GetByIdWithDetailsAsync(eventId);

            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            // Auto-fix status: If event is in draft but has participants invited (beyond organizer), auto-transition
            if (eventEntity.Status == "draft" && eventEntity.EventParticipants != null)
            {
                // Count participants excluding organizer (organizer is auto-accepted)
                var invitedParticipants = eventEntity.EventParticipants
                    .Where(ep => ep.UserId != eventEntity.OrganizerId)
                    .ToList();

                // If there are invited participants, auto-transition to planning → inviting
                if (invitedParticipants.Any())
                {
                    try
                    {
                        // Transition from draft to planning
                        await _stateMachine.TransitionToAsync(eventEntity, "planning");
                        // Reload to get updated status
                        eventEntity = await _eventRepository.GetByIdWithDetailsAsync(eventId);
                        
                        // Transition from planning to inviting
                        if (eventEntity.Status == "planning")
                        {
                            await _stateMachine.TransitionToAsync(eventEntity, "inviting");
                            // Reload to get updated status
                            eventEntity = await _eventRepository.GetByIdWithDetailsAsync(eventId);
                        }
                    }
                    catch (Exception ex)
                    {
                        // Log error but don't fail the request
                        Console.WriteLine($"Auto-transition failed for event {eventId}: {ex.Message}");
                    }
                }
            }

            // Auto-transition: planning → inviting → (gathering_preferences or confirmed) if 70% acceptance threshold is met
            // If FinalPlaceId exists, transition to confirmed; otherwise transition to gathering_preferences
            if ((eventEntity.Status == "planning" || eventEntity.Status == "inviting") && eventEntity.EventParticipants != null)
            {
                try
                {
                    // First, transition from planning to inviting if needed
                    if (eventEntity.Status == "planning")
                    {
                        await _stateMachine.TransitionToAsync(eventEntity, "inviting");
                        // Reload to get updated status
                        eventEntity = await _eventRepository.GetByIdWithDetailsAsync(eventId);
                    }

                    // Then check if we can transition to gathering_preferences or confirmed
                    if (eventEntity.Status == "inviting")
                    {
                        var acceptedCount = await _eventRepository.GetAcceptedParticipantsCountAsync(eventId);
                        
                        // Check if acceptance threshold is met (using event's custom threshold or default 70%)
                        if (EventBusinessRules.CheckAcceptanceThreshold(acceptedCount, eventEntity.ExpectedAttendees, eventEntity.AcceptanceThreshold))
                        {
                            if (eventEntity.FinalPlaceId.HasValue)
                            {
                                // If venue is already chosen, transition directly to confirmed
                                await _stateMachine.TransitionToAsync(eventEntity, "confirmed");
                            }
                            else
                            {
                                // Otherwise, transition to gathering_preferences for voting
                                await _stateMachine.TransitionToAsync(eventEntity, "gathering_preferences");
                            }
                            // Reload to get updated status
                            eventEntity = await _eventRepository.GetByIdWithDetailsAsync(eventId);
                        }
                    }
                }
                catch (Exception ex)
                {
                    // Log error but don't fail the request
                    Console.WriteLine($"Auto-transition to gathering_preferences failed for event {eventId}: {ex.Message}");
                }
            }

            return eventEntity;
        }

        public async Task<List<Event>> GetEventsByOrganizerAsync(Guid organizerId)
        {
            return await _eventRepository.GetByOrganizerAsync(organizerId);
        }

        public async Task<List<Event>> GetEventsByParticipantAsync(Guid userId)
        {
            return await _eventRepository.GetByParticipantAsync(userId);
        }

        public async Task<bool> InviteParticipantsAsync(Guid eventId, List<Guid> userIds, Guid invitedBy)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            // Validate status and deadline for invitations
            EventBusinessRules.ValidateStatusForInvitations(eventEntity.Status);
            EventBusinessRules.ValidateInvitationDeadline(eventEntity);

            // BR_EVENT_10: Authorization Check - Only organizer can invite
            if (eventEntity.OrganizerId != invitedBy)
                throw new UnauthorizedAccessException("Only the event organizer can invite participants");

            // BR_EVENT_11: Status Restrictions - Cannot invite if event is cancelled or completed
            if (eventEntity.Status == "cancelled")
                throw new InvalidOperationException("Cannot invite participants to a cancelled event");
            
            if (eventEntity.Status == "completed")
                throw new InvalidOperationException("Cannot invite participants to a completed event");

            // BR_EVENT_12: Validate request - UserIds cannot be null or empty
            if (userIds == null || userIds.Count == 0)
                throw new BusinessRuleException("At least one user must be selected to invite", "BR_EVENT_12");

            // Remove duplicates
            userIds = userIds.Distinct().ToList();

            // BR_EVENT_13: Self-Invite Prevention - Organizer cannot invite themselves
            userIds = userIds.Where(uid => uid != eventEntity.OrganizerId).ToList();
            if (userIds.Count == 0)
                throw new BusinessRuleException("Cannot invite only yourself. Organizer is already a participant.", "BR_EVENT_13");

            // BR_EVENT_14: Max Attendees Check - Check if event has capacity
            if (eventEntity.MaxAttendees.HasValue)
            {
                // Get event with participants to count current participants
                var eventWithDetails = await _eventRepository.GetByIdWithDetailsAsync(eventId);
                var currentAcceptedCount = eventWithDetails.EventParticipants?
                    .Count(ep => ep.InvitationStatus == "accepted") ?? 0;
                var currentPendingCount = eventWithDetails.EventParticipants?
                    .Count(ep => ep.InvitationStatus == "pending") ?? 0;
                var totalCurrentParticipants = currentAcceptedCount + currentPendingCount;
                
                // Check if adding new invites would exceed max attendees
                if (totalCurrentParticipants + userIds.Count > eventEntity.MaxAttendees.Value)
                {
                    var availableSlots = eventEntity.MaxAttendees.Value - totalCurrentParticipants;
                    throw new BusinessRuleException(
                        $"Event has reached maximum capacity. Only {availableSlots} slot(s) available.",
                        "BR_EVENT_14"
                    );
                }
            }

            // Get organizer information for notification
            var organizer = await _userRepository.GetByIdAsync(invitedBy);
            var organizerName = organizer?.FullName ?? "Someone";

            // Auto-transition status: draft → planning → inviting
            if (eventEntity.Status == "draft")
            {
                // First transition from draft to planning
                await _stateMachine.TransitionToAsync(eventEntity, "planning");
                // Reload event to get updated status
                eventEntity = await _eventRepository.GetByIdAsync(eventId);
            }
            
            // Transition to inviting if in planning
            if (eventEntity.Status == "planning")
            {
                await _stateMachine.TransitionToAsync(eventEntity, "inviting");
                // Reload event to get updated status
                eventEntity = await _eventRepository.GetByIdAsync(eventId);
            }

            // Create participant records and send notifications
            foreach (var userId in userIds)
            {
                // Check if already invited
                var existing = await _participantRepository.GetByEventAndUserAsync(eventId, userId);

                bool shouldSendNotification = false;

                if (existing == null)
                {
                    // New invitation - create participant record
                    var participant = new EventParticipant
                    {
                        EventId = eventId,
                        UserId = userId,
                        InvitationStatus = "pending",
                        InvitedAt = DateTimeOffset.Now,
                        InvitedBy = invitedBy,
                        AdditionalNotes = string.Empty // Ensure non-null value
                    };

                    await _participantRepository.CreateAsync(participant);
                    shouldSendNotification = true;
                }
                else if (existing.InvitationStatus == "declined")
                {
                    // Allow re-inviting users who previously declined
                    // Update status from declined to pending
                    existing.InvitationStatus = "pending";
                    existing.InvitedAt = DateTimeOffset.Now;
                    existing.InvitedBy = invitedBy;
                    existing.RsvpDate = null; // Clear previous RSVP date
                    await _participantRepository.UpdateAsync(existing);
                    shouldSendNotification = true;
                }
                else if (existing.InvitationStatus == "pending" || existing.InvitationStatus == "accepted")
                {
                    // Already invited or accepted - skip (no need to send notification again)
                    continue;
                }

                // Send notification only for new invitations or re-invitations (declined → pending)
                if (shouldSendNotification)
                {
                    // Auto-create or update event chat when participant is invited
                    try
                    {
                        await EnsureEventChatExistsAsync(eventId, eventEntity.OrganizerId);
                    }
                    catch (Exception chatEx)
                    {
                        // Log but don't fail invitation
                        Console.WriteLine($"Error ensuring event chat exists: {chatEx.Message}");
                    }

                    // Send notification to invited user via SignalR
                    try
                    {
                        var notificationMessage = new GeneralNotificationMessage
                        {
                            Title = "Event Invitation",
                            Message = $"{organizerName} has invited you to join the event \"{eventEntity.Title}\"",
                            Type = "Info",
                            SenderId = invitedBy,
                            TargetUserId = userId,
                            SentAt = DateTimeOffset.UtcNow
                        };

                        var createNotificationDto = new CreateNotificationDto
                        {
                            UserId = userId,
                            NotificationType = "EventInvitation",
                            Title = "Event Invitation",
                            Message = $"{organizerName} has invited you to join the event \"{eventEntity.Title}\"",
                            ActionType = "ViewEvent",
                            ActionData = JsonSerializer.Serialize(new
                            {
                                EventId = eventId,
                                EventTitle = eventEntity.Title,
                                InvitedBy = invitedBy,
                                InvitedByName = organizerName,
                                InvitedAt = DateTimeOffset.UtcNow
                            }),
                            DeepLinkUrl = $"/user/events/{eventId}",
                            DeliveryChannels = JsonSerializer.Serialize(new[] { "Web", "Push" }),
                            IsRead = false,
                            IsDismissed = false
                        };

                        await _notificationService.NotifyAndSaveNotification(
                            notificationMessage,
                            createNotificationDto,
                            BoardcastMode.User
                        );
                    }
                    catch (Exception ex)
                    {
                        // Log error but don't fail the invitation process
                        Console.WriteLine($"Failed to send notification to user {userId}: {ex.Message}");
                    }
                }
            }

            return true;
        }

        public async Task<bool> RequestToJoinAsync(Guid eventId, Guid userId)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            // Check if event is public
            if (eventEntity.Privacy != "Public")
                throw new InvalidOperationException("Only public events allow join requests");

            // Check if event is in inviting status
            if (eventEntity.Status != "inviting")
                throw new InvalidOperationException("Event is not accepting join requests at this time");

            // Check if user is already a participant
            var existingParticipant = await _participantRepository.GetByEventAndUserAsync(eventId, userId);
            if (existingParticipant != null)
            {
                if (existingParticipant.InvitationStatus == "accepted")
                    throw new InvalidOperationException("You are already a participant of this event");
                if (existingParticipant.InvitationStatus == "pending")
                    throw new InvalidOperationException("You have already requested to join this event");
            }

            // Check if event has space
            var maxAttendees = eventEntity.MaxAttendees ?? eventEntity.ExpectedAttendees;
            var acceptedCount = await _eventRepository.GetAcceptedParticipantsCountAsync(eventId);
            if (acceptedCount >= maxAttendees)
                throw new InvalidOperationException("Event is full. Please join the waitlist instead");

            // Get user info for notification
            var user = await _userRepository.GetByIdAsync(userId);
            var userName = user?.FullName ?? "Someone";

            // Create participant record with pending status
            if (existingParticipant == null)
            {
                var participant = new EventParticipant
                {
                    EventId = eventId,
                    UserId = userId,
                    InvitationStatus = "pending",
                    InvitedAt = DateTimeOffset.Now,
                    InvitedBy = userId, // Self-requested
                    AdditionalNotes = string.Empty
                };
                await _participantRepository.CreateAsync(participant);
            }
            else if (existingParticipant.InvitationStatus == "declined")
            {
                // Allow re-requesting if previously declined
                existingParticipant.InvitationStatus = "pending";
                existingParticipant.InvitedAt = DateTimeOffset.Now;
                existingParticipant.InvitedBy = userId;
                existingParticipant.RsvpDate = null;
                await _participantRepository.UpdateAsync(existingParticipant);
            }

            // Send notification to organizer
            try
            {
                var organizer = await _userRepository.GetByIdAsync(eventEntity.OrganizerId);
                var organizerName = organizer?.FullName ?? "Organizer";

                var notificationMessage = new GeneralNotificationMessage
                {
                    Title = "Join Request",
                    Message = $"{userName} has requested to join your event \"{eventEntity.Title}\"",
                    Type = "Info",
                    SenderId = userId,
                    TargetUserId = eventEntity.OrganizerId,
                    SentAt = DateTimeOffset.UtcNow
                };

                var createNotificationDto = new CreateNotificationDto
                {
                    UserId = eventEntity.OrganizerId,
                    NotificationType = "EventJoinRequest",
                    Title = "Join Request",
                    Message = $"{userName} has requested to join your event \"{eventEntity.Title}\"",
                    ActionType = "ViewEvent",
                    ActionData = JsonSerializer.Serialize(new
                    {
                        EventId = eventId,
                        EventTitle = eventEntity.Title,
                        RequestedBy = userId,
                        RequestedByName = userName,
                        RequestedAt = DateTimeOffset.UtcNow
                    }),
                    DeepLinkUrl = $"/user/events/{eventId}",
                    DeliveryChannels = JsonSerializer.Serialize(new[] { "Web", "Push" }),
                    IsRead = false,
                    IsDismissed = false
                };

                await _notificationService.NotifyAndSaveNotification(
                    notificationMessage,
                    createNotificationDto,
                    BoardcastMode.User
                );
            }
            catch (Exception ex)
            {
                // Log error but don't fail the request
                _logger.LogWarning($"Failed to send notification to organizer: {ex.Message}");
            }

            return true;
        }

        public async Task<bool> AcceptInvitationAsync(Guid eventId, Guid userId)
        {
            var participant = await _participantRepository.GetByEventAndUserAsync(eventId, userId);

            if (participant == null)
                throw new NotFoundException("Invitation not found");

            // Get event and check status transitions
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            // Validate deadline for acceptance
            EventBusinessRules.ValidateInvitationDeadline(eventEntity);

            participant.InvitationStatus = "accepted";
            participant.RsvpDate = DateTimeOffset.Now;

            // Add user to event chat when they accept invitation
            try
            {
                await EnsureEventChatExistsAsync(eventId, eventEntity.OrganizerId);
                var existingConversation = await _conversationRepository.GetConversationByEventIdAsync(eventId);
                if (existingConversation != null)
                {
                    var isConversationParticipant = await _conversationRepository.IsParticipantAsync(
                        existingConversation.ConversationId, userId);
                    
                    if (!isConversationParticipant)
                    {
                        await _conversationService.AddParticipantsAsync(
                            existingConversation.ConversationId,
                            eventEntity.OrganizerId,
                            new List<Guid> { userId });
                    }
                }
            }
            catch (Exception chatEx)
            {
                // Log but don't fail acceptance
                Console.WriteLine($"Error adding user to event chat: {chatEx.Message}");
            }
            
            // First, ensure event is in "inviting" status if it's in "planning"
            if (eventEntity.Status == "planning")
            {
                await _stateMachine.TransitionToAsync(eventEntity, "inviting");
                // Reload to get updated status
                eventEntity = await _eventRepository.GetByIdAsync(eventId);
            }

            // Check if we can transition to next phase
            var acceptedCount = await GetAcceptedParticipantsCountAsync(eventId);

            if (EventBusinessRules.CheckAcceptanceThreshold(acceptedCount, eventEntity.ExpectedAttendees, eventEntity.AcceptanceThreshold))
            {
                if (eventEntity.Status == "inviting")
                {
                    if (eventEntity.FinalPlaceId.HasValue)
                    {
                        // If venue is already chosen, transition directly to confirmed
                        await _stateMachine.TransitionToAsync(eventEntity, "confirmed");
                    }
                    else
                    {
                        // Otherwise, transition to gathering_preferences for voting
                        await _stateMachine.TransitionToAsync(eventEntity, "gathering_preferences");
                    }
                }
            }

            // Save the participant status change to database
            await _participantRepository.UpdateAsync(participant);

            return true;
        }

        public async Task<bool> DeclineInvitationAsync(Guid eventId, Guid userId)
        {
            var participant = await _participantRepository.GetByEventAndUserAsync(eventId, userId);

            if (participant == null)
                throw new NotFoundException("Invitation not found");

            // Get event
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity != null)
            {
                // Validate deadline for declining
                EventBusinessRules.ValidateInvitationDeadline(eventEntity);
            }

            participant.InvitationStatus = "declined";
            participant.RsvpDate = DateTimeOffset.Now;

            await _participantRepository.UpdateAsync(participant);
            return true;
        }

        public async Task<bool> RemoveParticipantAsync(Guid eventId, Guid participantUserId, Guid organizerId)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            // Only organizer can remove participants/invitations
            if (eventEntity.OrganizerId != organizerId)
                throw new UnauthorizedAccessException("Only the event organizer can remove participants");

            // Cannot remove organizer
            if (eventEntity.OrganizerId == participantUserId)
                throw new InvalidOperationException("Cannot remove the event organizer");

            var participant = await _participantRepository.GetByEventAndUserAsync(eventId, participantUserId);
            if (participant == null)
                throw new NotFoundException("Participant not found");

            // If participant has accepted, remove them from event (including chat)
            // If participant is pending/declined, cancel the invitation
            bool isAccepted = participant.InvitationStatus == "accepted";

            // Remove participant from event chat if exists (only for accepted participants)
            if (isAccepted)
            {
                try
                {
                    var conversation = await _conversationRepository.GetConversationByEventIdAsync(eventId);
                    if (conversation != null)
                    {
                        var isParticipant = await _conversationRepository.IsParticipantAsync(conversation.ConversationId, participantUserId);
                        if (isParticipant)
                        {
                            await _conversationService.RemoveParticipantAsync(conversation.ConversationId, organizerId, participantUserId);
                        }
                    }
                }
                catch (Exception ex)
                {
                    // Log but don't fail removal
                    Console.WriteLine($"Error removing participant from event chat: {ex.Message}");
                }
            }

            // Delete participant record (removes invitation for pending/declined, removes participant for accepted)
            await _participantRepository.DeleteAsync(participant);
            return true;
        }

        public async Task<int> GetAcceptedParticipantsCountAsync(Guid eventId)
        {
            return await _eventRepository.GetAcceptedParticipantsCountAsync(eventId);
        }

        public async Task<bool> CancelEventAsync(Guid eventId, string reason)
        {
            var eventEntity = await _eventRepository.GetByIdWithDetailsAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            // Validate cancellation reason
            if (string.IsNullOrWhiteSpace(reason))
                throw new BusinessRuleException("Cancellation reason is required", "BR_EVENT_08");
            
            if (reason.Length < 10 || reason.Length > 500)
                throw new BusinessRuleException("Cancellation reason must be between 10 and 500 characters", "BR_EVENT_09");

            // Check if event is already cancelled
            if (eventEntity.Status == "cancelled")
                throw new InvalidOperationException("Event is already cancelled");

            // Check if event is completed (cannot cancel completed events)
            if (eventEntity.Status == "completed")
                throw new InvalidOperationException("Cannot cancel a completed event");

            // Transition to cancelled status
            await _stateMachine.TransitionToAsync(eventEntity, "cancelled", reason);

            // Reload event to get updated cancellation info
            eventEntity = await _eventRepository.GetByIdWithDetailsAsync(eventId);

            // Get organizer information
            var organizer = await _userRepository.GetByIdAsync(eventEntity.OrganizerId);
            var organizerName = organizer != null 
                ? $"{organizer.FirstName} {organizer.LastName}".Trim() 
                : "Event Organizer";

            // Get all participants (accepted, pending, etc.) to notify them
            var participants = eventEntity.EventParticipants?.ToList() ?? new List<EventParticipant>();

            // Send email notifications to all participants
            var emailTasks = new List<Task>();
            foreach (var participant in participants)
            {
                if (participant.User != null && !string.IsNullOrEmpty(participant.User.Email))
                {
                    emailTasks.Add(_emailService.SendEventCancellationEmailAsync(
                        participant.User.Email,
                        eventEntity,
                        organizerName,
                        reason ?? "No reason provided"));
                }
            }

            // Send emails in parallel (don't wait, fire and forget)
            _ = Task.Run(async () =>
            {
                try
                {
                    await Task.WhenAll(emailTasks);
                }
                catch (Exception ex)
                {
                    // Log errors but don't fail the cancellation
                    Console.WriteLine($"Error sending cancellation emails: {ex.Message}");
                }
            });

            // Send in-app notifications to all participants
            foreach (var participant in participants)
            {
                if (participant.UserId != eventEntity.OrganizerId) // Don't notify organizer
                {
                    try
                    {
                        var notificationMessage = new GeneralNotificationMessage
                        {
                            Title = "Event Cancelled",
                            Message = $"Event '{eventEntity.Title}' has been cancelled. Reason: {reason ?? "No reason provided"}",
                            Type = NotificationMessageType.DataUpdated.ToString(),
                            SenderId = eventEntity.OrganizerId,
                            TargetUserId = participant.UserId
                        };

                        await _notificationService.BoardcastToSpecificUserByIdAsync(notificationMessage);
                    }
                    catch (Exception ex)
                    {
                        // Log but don't fail
                        Console.WriteLine($"Error sending notification to user {participant.UserId}: {ex.Message}");
                    }
                }
            }

            return true;
        }

        public async Task<ConversationDto> GetOrCreateEventChatAsync(Guid eventId, Guid userId)
        {
            // Verify event exists and user is participant
            var eventEntity = await _eventRepository.GetByIdWithDetailsAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            var isParticipant = eventEntity.EventParticipants?.Any(ep => ep.UserId == userId && 
                (ep.InvitationStatus == "accepted" || ep.InvitationStatus == "pending")) ?? false;
            
            if (!isParticipant && eventEntity.OrganizerId != userId)
                throw new UnauthorizedAccessException("You must be a participant or organizer to access event chat");

            // Check if conversation already exists for this event
            var existingConversation = await _conversationRepository.GetConversationByEventIdAsync(eventId);

            if (existingConversation != null)
            {
                // Sync conversation avatar with event image if needed
                if (existingConversation.ConversationAvatar != eventEntity.EventImageUrl)
                {
                    existingConversation.ConversationAvatar = eventEntity.EventImageUrl;
                    await _conversationRepository.UpdateAsync(existingConversation);
                }

                // Ensure user is a participant in the conversation
                var isConversationParticipant = await _conversationRepository.IsParticipantAsync(
                    existingConversation.ConversationId, userId);

                if (!isConversationParticipant)
                {
                    // Add user to conversation
                    await _conversationService.AddParticipantsAsync(
                        existingConversation.ConversationId,
                        eventEntity.OrganizerId, // Use organizer as admin
                        new List<Guid> { userId });
                }

                return await _conversationService.GetConversationByIdAsync(existingConversation.ConversationId, userId);
            }

            // Create new conversation for event
            var participants = eventEntity.EventParticipants?
                .Where(ep => ep.InvitationStatus == "accepted" || ep.InvitationStatus == "pending")
                .Select(ep => ep.UserId)
                .ToList() ?? new List<Guid>();

            // Always include organizer
            if (!participants.Contains(eventEntity.OrganizerId))
                participants.Add(eventEntity.OrganizerId);

            // Ensure at least organizer is in the list
            if (participants.Count == 0)
            {
                participants.Add(eventEntity.OrganizerId);
            }

            var createConversationDto = new CreateConversationDto
            {
                ConversationType = "event",
                ConversationName = $"Event: {eventEntity.Title}",
                ConversationAvatar = eventEntity.EventImageUrl, // Use event image as conversation avatar
                ParticipantIds = participants
            };

            var conversation = await _conversationService.CreateConversationAsync(eventEntity.OrganizerId, createConversationDto);

            // Link conversation to event (need to update conversation entity)
            var conversationEntity = await _conversationRepository.GetByIdAsync(conversation.ConversationId);
            if (conversationEntity != null)
            {
                conversationEntity.EventId = eventId;
                await _conversationRepository.UpdateAsync(conversationEntity);
            }

            return conversation;
        }

        private async Task EnsureEventChatExistsAsync(Guid eventId, Guid organizerId)
        {
            var existingConversation = await _conversationRepository.GetConversationByEventIdAsync(eventId);
            
            if (existingConversation == null)
            {
                // Create chat if it doesn't exist
                var eventEntity = await _eventRepository.GetByIdWithDetailsAsync(eventId);
                if (eventEntity != null)
                {
                    var participants = eventEntity.EventParticipants?
                        .Where(ep => ep.InvitationStatus == "accepted" || ep.InvitationStatus == "pending")
                        .Select(ep => ep.UserId)
                        .ToList() ?? new List<Guid>();

                    if (!participants.Contains(organizerId))
                        participants.Add(organizerId);

                    if (participants.Any())
                    {
                        var createConversationDto = new CreateConversationDto
                        {
                            ConversationType = "event",
                            ConversationName = $"Event: {eventEntity.Title}",
                            ConversationAvatar = eventEntity.EventImageUrl, // Use event image as conversation avatar
                            ParticipantIds = participants
                        };

                        var conversation = await _conversationService.CreateConversationAsync(organizerId, createConversationDto);
                        
                        // Link conversation to event
                        var conversationEntity = await _conversationRepository.GetByIdAsync(conversation.ConversationId);
                        if (conversationEntity != null)
                        {
                            conversationEntity.EventId = eventId;
                            await _conversationRepository.UpdateAsync(conversationEntity);
                        }
                    }
                }
            }
        }

        public async Task<bool> FinalizeEventAsync(Guid eventId, Guid optionId, Guid userId)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            // Verify the option exists
            var option = await _eventRepository.GetByIdWithDetailsAsync(eventId);
            var venueOption = option?.EventPlaceOptions.FirstOrDefault(epo => epo.OptionId == optionId);

            if (venueOption == null)
                throw new NotFoundException("Venue option not found");

            // Business Rule: Cannot finalize event with a place that is not approved
            // Only applies to internal places (PlaceId != null)
            if (venueOption.PlaceId.HasValue)
            {
                var place = await _placeRepository.GetByIdAsync(venueOption.PlaceId.Value, userId);
                if (place == null)
                    throw new NotFoundException("Place not found");

                if (place.VerificationStatus != Domain.Enums.PlaceVerificationStatus.Approved)
                {
                    var statusMessage = place.VerificationStatus == Domain.Enums.PlaceVerificationStatus.Pending
                        ? "This place is pending moderator approval and cannot be finalized yet."
                        : "This place has been rejected and cannot be used for the event.";
                    throw new InvalidOperationException(statusMessage);
                }
            }

            // Set final place
            eventEntity.FinalPlaceId = venueOption.PlaceId;

            // Auto-set timezone from place location if place exists
            if (venueOption.PlaceId.HasValue)
            {
                try
                {
                    // Load place with Branch and Country to get timezone
                    var place = await _placeRepository.GetByIdAsync(venueOption.PlaceId.Value, userId);
                    if (place?.Branch?.Country != null && !string.IsNullOrEmpty(place.Branch.Country.TimeZone))
                    {
                        eventEntity.Timezone = place.Branch.Country.TimeZone;
                        _logger.LogInformation($"Auto-set event timezone to {eventEntity.Timezone} from place location");
                    }
                    else
                    {
                        // Fallback: try to determine timezone from city name
                        // Common timezone mappings for major cities
                        if (!string.IsNullOrEmpty(place?.City))
                        {
                            var cityName = place.City.ToLower();
                            if (cityName.Contains("ho chi minh") || cityName.Contains("hồ chí minh") || cityName.Contains("saigon"))
                            {
                                eventEntity.Timezone = "UTC+07:00";
                            }
                            else if (cityName.Contains("hanoi") || cityName.Contains("hà nội"))
                            {
                                eventEntity.Timezone = "UTC+07:00";
                            }
                            else if (cityName.Contains("new york"))
                            {
                                eventEntity.Timezone = "UTC-05:00"; // EST (UTC-5) or EDT (UTC-4), using EST as default
                            }
                            else if (cityName.Contains("london"))
                            {
                                eventEntity.Timezone = "UTC+00:00"; // GMT/UTC
                            }
                            else if (cityName.Contains("tokyo"))
                            {
                                eventEntity.Timezone = "UTC+09:00";
                            }
                            else if (cityName.Contains("singapore"))
                            {
                                eventEntity.Timezone = "UTC+08:00";
                            }
                            else
                            {
                                // Keep default UTC if cannot determine
                                _logger.LogWarning($"Could not determine timezone for city: {place.City}, keeping UTC");
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    // Log error but don't fail finalization
                    _logger.LogWarning(ex, $"Failed to auto-set timezone from place location for event {eventId}");
                }
            }

            // Transition to confirmed
            await _stateMachine.TransitionToAsync(eventEntity, "confirmed");

            await _eventRepository.UpdateAsync(eventEntity);
            return true;
        }

        public async Task<EventPlaceOption> AddManualPlaceOptionAsync(Guid eventId, Guid placeId, Guid userId)
        {
            var eventEntity = await _eventRepository.GetByIdWithDetailsAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            if (eventEntity.Status == "cancelled" || eventEntity.Status == "completed")
                throw new InvalidOperationException("Cannot add place options to a cancelled or completed event");

            if (eventEntity.Status != "ai_recommending" && eventEntity.Status != "voting")
                throw new InvalidOperationException("Place options can only be added during the AI recommending or voting phases");
            
            var isOrganizer = eventEntity.OrganizerId == userId;
            var isParticipant = eventEntity.EventParticipants?.Any(ep => ep.UserId == userId && ep.InvitationStatus == "accepted") ?? false;

            if (!isOrganizer && !isParticipant)
                throw new UnauthorizedAccessException("Only organizer or accepted participants can add place options");
            
            // Validate place exists and is in valid verification status
            var place = await _placeRepository.GetByIdAsync(placeId, userId);
            if (place == null)
                throw new NotFoundException("Place not found in the system");
            
            if (place.IsDeleted)
                throw new InvalidOperationException("Cannot add a deleted place to the event");
            
            if (place.VerificationStatus == PlaceVerificationStatus.Rejected)
                throw new InvalidOperationException("Cannot add a rejected place to the event. The place must be approved or pending approval.");
            
            if (place.VerificationStatus != PlaceVerificationStatus.Approved && place.VerificationStatus != PlaceVerificationStatus.Pending)
                throw new InvalidOperationException("The place must be approved or pending approval to be added to the event");
            
            var existingOptions = await _optionRepository.GetByEventIdAsync(eventId);
            if (existingOptions.Any(opt => opt.PlaceId == placeId))
                throw new InvalidOperationException("This place is already added to the event");
            var placeOption = new EventPlaceOption
            {
                EventId = eventId,
                PlaceId = placeId,
                SuggestedBy = "user",
                AddedAt = DateTimeOffset.Now,
                AiReasoning = "Manually added by user",
                Pros = "[]",
                Cons = "[]",
                AiScore = null,
                EstimatedCostPerPerson = null,
                AvailabilityConfirmed = false
            };

            var createdOption = await _optionRepository.CreateAsync(placeOption);
            return createdOption;
        }

        /// <summary>
        /// Convert external place option (TrackAsia) to internal Place in the system
        /// Creates a new Place from external data and updates the EventPlaceOption to reference it
        /// </summary>
        public async Task<EventPlaceOption> ConvertExternalPlaceToInternalAsync(Guid eventId, Guid optionId, Guid userId)
        {
            var eventEntity = await _eventRepository.GetByIdWithDetailsAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            var isOrganizer = eventEntity.OrganizerId == userId;
            var isParticipant = eventEntity.EventParticipants?.Any(ep => ep.UserId == userId && ep.InvitationStatus == "accepted") ?? false;

            if (!isOrganizer && !isParticipant)
                throw new UnauthorizedAccessException("Only organizer or accepted participants can convert places");

            var placeOption = await _optionRepository.GetByIdAsync(optionId);
            if (placeOption == null)
                throw new NotFoundException("Place option not found");

            if (placeOption.EventId != eventId)
                throw new InvalidOperationException("Place option does not belong to this event");

            if (placeOption.PlaceId != null)
                throw new InvalidOperationException("This place option is already internal");

            if (string.IsNullOrEmpty(placeOption.ExternalProvider) || string.IsNullOrEmpty(placeOption.ExternalPlaceId))
                throw new InvalidOperationException("This place option does not have external provider data");

            var existingPlace = await _placeRepository.GetAllPlace()
                .FirstOrDefaultAsync(p => p.GooglePlaceId == placeOption.ExternalPlaceId && !p.IsDeleted);

            Place newPlace;
            if (existingPlace != null)
            {
                newPlace = existingPlace;
                _logger.LogInformation("External place {ExternalPlaceId} already exists as Place {PlaceId}, linking",
                    placeOption.ExternalPlaceId, existingPlace.PlaceId);
            }
            else
            {
                var user = await _userRepository.GetByIdAsync(userId);
                var branchId = user?.CurrentBranchId ?? eventEntity.EventParticipants
                    .FirstOrDefault(ep => ep.UserId == eventEntity.OrganizerId)?.User?.CurrentBranchId ?? Guid.Empty;

                int? categoryId = DetermineCategoryFromExternalCategory(placeOption.ExternalCategory);

                newPlace = new Place
                {
                    PlaceId = Guid.NewGuid(),
                    Name = placeOption.ExternalPlaceName ?? "Unknown Place",
                    Description = $"Added from {placeOption.ExternalProvider}",
                    GooglePlaceId = placeOption.ExternalPlaceId,
                    Latitude = placeOption.ExternalLatitude ?? 0,
                    Longitude = placeOption.ExternalLongitude ?? 0,
                    AddressLine1 = placeOption.ExternalAddress ?? "",
                    City = "Ho Chi Minh City",
                    StateProvince = "Ho Chi Minh",
                    PhoneNumber = placeOption.ExternalPhoneNumber,
                    WebsiteUrl = placeOption.ExternalWebsite,
                    AverageRating = placeOption.ExternalRating ?? 0,
                    TotalReviews = placeOption.ExternalTotalReviews ?? 0,
                    CategoryId = categoryId,
                    BranchId = branchId,
                    VerificationStatus = Domain.Enums.PlaceVerificationStatus.Pending,
                    IsDeleted = false,
                    CreatedBy = userId,
                    CreatedAt = DateTimeOffset.Now,
                    UpdatedAt = DateTimeOffset.Now
                };

                var geometryFactory = NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);
                newPlace.GeoLocation = geometryFactory.CreatePoint(
                    new NetTopologySuite.Geometries.Coordinate(newPlace.Longitude, newPlace.Latitude));

                try
                {
                    newPlace = await _placeRepository.CreatePlaceAsync(newPlace);
                    _logger.LogInformation("Created new Place {PlaceId} from external {Provider} place {ExternalId}",
                        newPlace.PlaceId, placeOption.ExternalProvider, placeOption.ExternalPlaceId);
                }
                catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
                {
                    existingPlace = await _placeRepository.GetAllPlace()
                        .FirstOrDefaultAsync(p => p.GooglePlaceId == placeOption.ExternalPlaceId && !p.IsDeleted);
                    if (existingPlace != null)
                    {
                        newPlace = existingPlace;
                    }
                    else
                    {
                        throw;
                    }
                }
            }

            placeOption.PlaceId = newPlace.PlaceId;            
            await _optionRepository.UpdateAsync(placeOption);

            _logger.LogInformation("Converted external place option {OptionId} to internal Place {PlaceId}",
                optionId, newPlace.PlaceId);

            return placeOption;
        }

        private int? DetermineCategoryFromExternalCategory(string externalCategory)
        {
            if (string.IsNullOrEmpty(externalCategory))
                return 1; // Default: Restaurant

            var categoryLower = externalCategory.ToLowerInvariant();
            
            if (categoryLower.Contains("restaurant") || categoryLower.Contains("food") || categoryLower.Contains("meal"))
                return 1; // Restaurant
            if (categoryLower.Contains("cafe") || categoryLower.Contains("coffee") || categoryLower.Contains("bakery"))
                return 2; // Cafe
            if (categoryLower.Contains("bar") || categoryLower.Contains("pub") || categoryLower.Contains("night"))
                return 3; // Bar (if exists in your system)
            
            return 1; // Default: Restaurant
        }

        public async Task<bool> RescheduleEventAsync(
            Guid eventId,
            Guid userId,
            DateTime newDate,
            TimeSpan newTime,
            string reason)
        {
            var eventEntity = await _eventRepository.GetByIdWithDetailsAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            if (eventEntity.OrganizerId != userId)
                throw new UnauthorizedAccessException("Only organizer can reschedule event");

            if (eventEntity.Status == "completed" || eventEntity.Status == "cancelled")
                throw new InvalidOperationException("Cannot reschedule completed or cancelled event");

            // Get user profile to get timezone
            var userProfile = await _userProfileRepository.GetByUserIdAsync(userId);
            var userTimezone = userProfile?.Timezone ?? "UTC+00:00";

            // Convert scheduled date and time from user's timezone to UTC
            var (utcDate, utcTime) = ConvertToUtc(newDate, newTime, userTimezone);

            // Create temporary event object for validation (using UTC times)
            var tempEvent = new Event
            {
                ScheduledDate = utcDate,
                ScheduledTime = utcTime,
                EstimatedDuration = eventEntity.EstimatedDuration,
                ExpectedAttendees = eventEntity.ExpectedAttendees,
                BudgetTotal = eventEntity.BudgetTotal,
                BudgetPerPerson = eventEntity.BudgetPerPerson
            };

            // Validate business rules for new schedule (after UTC conversion)
            EventBusinessRules.ValidateMinimumAdvanceScheduling(tempEvent);
            EventBusinessRules.ValidateBudget(tempEvent);

            // Check for overlapping events (exclude current event, using UTC times)
            var overlappingEvents = await _eventRepository.GetOverlappingEventsAsync(
                eventEntity.OrganizerId,
                utcDate,
                utcTime,
                eventEntity.EstimatedDuration,
                eventId // Exclude current event from overlap check
            );
            EventBusinessRules.ValidateNoTimeOverlap(overlappingEvents, tempEvent);

            // Save previous schedule
            eventEntity.PreviousScheduledDate = eventEntity.ScheduledDate;
            eventEntity.PreviousScheduledTime = eventEntity.ScheduledTime;
            eventEntity.RescheduleCount++;
            eventEntity.LastRescheduledAt = DateTimeOffset.UtcNow;
            eventEntity.RescheduleReason = reason;

            // Update schedule (using UTC times)
            eventEntity.ScheduledDate = utcDate;
            eventEntity.ScheduledTime = utcTime;
            eventEntity.Timezone = userTimezone; // Update timezone if changed
            eventEntity.UpdatedAt = DateTimeOffset.UtcNow;

            await _eventRepository.UpdateAsync(eventEntity);

            // Notify all participants
            var participants = eventEntity.EventParticipants?
                .Where(ep => ep.InvitationStatus == "accepted" || ep.InvitationStatus == "pending")
                .ToList() ?? new List<EventParticipant>();

            var organizer = await _userRepository.GetByIdAsync(userId);
            var organizerName = organizer != null
                ? $"{organizer.FirstName} {organizer.LastName}".Trim()
                : "Event Organizer";

            foreach (var participant in participants)
            {
                if (participant.User != null && !string.IsNullOrEmpty(participant.User.Email))
                {
                    await _emailService.SendEventRescheduleEmailAsync(
                        participant.User.Email,
                        eventEntity,
                        organizerName,
                        reason,
                        eventEntity.PreviousScheduledDate ?? utcDate,
                        eventEntity.PreviousScheduledTime ?? new TimeSpan());
                }

                var notification = new GeneralNotificationMessage
                {
                    Title = "Event Rescheduled",
                    Message = $"Event '{eventEntity.Title}' has been rescheduled. New date: {utcDate:yyyy-MM-dd} at {utcTime:hh\\:mm} (UTC)",
                    Type = NotificationMessageType.DataUpdated.ToString(),
                    SenderId = userId,
                    TargetUserId = participant.UserId
                };

                await _notificationService.BoardcastToSpecificUserByIdAsync(notification);
            }

            // Log reschedule
            await _auditLogService.LogStateTransitionAsync(
                eventEntity.EventId,
                eventEntity.Status,
                eventEntity.Status,
                $"Event rescheduled: {reason}");

            return true;
        }

        public async Task<EventCheckIn?> GetCheckInByEventAndUserAsync(Guid eventId, Guid userId)
        {
            return await _checkInRepository.GetByEventAndUserAsync(eventId, userId);
        }

        public async Task<bool> CheckInEventAsync(
            Guid eventId,
            Guid userId,
            double? latitude = null,
            double? longitude = null,
            string checkInMethod = "manual")
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            if (eventEntity.Status != "confirmed" && eventEntity.Status != "completed")
                throw new InvalidOperationException("Can only check in to confirmed or completed events");

            // Verify user is participant
            var participant = await _participantRepository.GetByEventAndUserAsync(eventId, userId);
            if (participant == null || participant.InvitationStatus != "accepted")
                throw new UnauthorizedAccessException("You must be an accepted participant to check in");

            // Check if already checked in
            var existingCheckIn = await _checkInRepository.GetByEventAndUserAsync(eventId, userId);
            if (existingCheckIn != null)
                throw new InvalidOperationException("Already checked in");

            var checkIn = new EventCheckIn
            {
                EventId = eventId,
                UserId = userId,
                CheckedInAt = DateTimeOffset.UtcNow,
                CheckInMethod = checkInMethod,
                Latitude = latitude,
                Longitude = longitude
            };

            await _checkInRepository.CreateAsync(checkIn);
            return true;
        }

        public async Task<EventFeedback> SubmitEventFeedbackAsync(
            Guid eventId,
            Guid userId,
            int venueRating,
            int foodRating,
            int overallRating,
            string? comments = null,
            string? suggestions = null,
            bool wouldAttendAgain = false)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            if (eventEntity.Status != "completed")
                throw new InvalidOperationException("Can only submit feedback for completed events");

            // Verify user is participant
            var participant = await _participantRepository.GetByEventAndUserAsync(eventId, userId);
            if (participant == null)
                throw new UnauthorizedAccessException("You must be a participant to submit feedback");

            // Check if already submitted
            var existingFeedback = await _feedbackRepository.GetByEventAndUserAsync(eventId, userId);
            if (existingFeedback != null)
                throw new InvalidOperationException("Feedback already submitted");

            var feedback = new EventFeedback
            {
                EventId = eventId,
                UserId = userId,
                VenueRating = venueRating,
                FoodRating = foodRating,
                OverallRating = overallRating,
                Comments = comments,
                Suggestions = suggestions,
                WouldAttendAgain = wouldAttendAgain,
                SubmittedAt = DateTimeOffset.UtcNow
            };

            await _feedbackRepository.CreateAsync(feedback);

            // Notify organizer
            var notification = new GeneralNotificationMessage
            {
                Title = "New Event Feedback",
                Message = $"You received new feedback for event '{eventEntity.Title}'",
                Type = NotificationMessageType.DataCreated.ToString(),
                SenderId = userId,
                TargetUserId = eventEntity.OrganizerId
            };

            await _notificationService.BoardcastToSpecificUserByIdAsync(notification);

            return feedback;
        }

        public async Task<EventFeedback?> GetFeedbackByEventAndUserAsync(Guid eventId, Guid userId)
        {
            return await _feedbackRepository.GetByEventAndUserAsync(eventId, userId);
        }

        public async Task<EventFeedback> UpdateEventFeedbackAsync(
            Guid eventId,
            Guid userId,
            int venueRating,
            int foodRating,
            int overallRating,
            string? comments = null,
            string? suggestions = null,
            bool wouldAttendAgain = false)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            if (eventEntity.Status != "completed")
                throw new InvalidOperationException("Can only update feedback for completed events");

            // Verify user is participant
            var participant = await _participantRepository.GetByEventAndUserAsync(eventId, userId);
            if (participant == null)
                throw new UnauthorizedAccessException("You must be a participant to update feedback");

            // Get existing feedback
            var existingFeedback = await _feedbackRepository.GetByEventAndUserAsync(eventId, userId);
            if (existingFeedback == null)
                throw new NotFoundException("Feedback not found. Please submit feedback first.");

            // Update feedback
            existingFeedback.VenueRating = venueRating;
            existingFeedback.FoodRating = foodRating;
            existingFeedback.OverallRating = overallRating;
            existingFeedback.Comments = comments;
            existingFeedback.Suggestions = suggestions;
            existingFeedback.WouldAttendAgain = wouldAttendAgain;
            // Keep original SubmittedAt, don't update it

            await _feedbackRepository.UpdateAsync(existingFeedback);

            return existingFeedback;
        }

        // Event Templates
        public async Task<EventTemplate> CreateEventTemplateAsync(Guid userId, EventTemplate template)
        {
            template.CreatedBy = userId;
            template.CreatedAt = DateTimeOffset.UtcNow;
            template.UpdatedAt = DateTimeOffset.UtcNow;
            return await _templateRepository.CreateAsync(template);
        }

        public async Task<Event> CreateEventFromTemplateAsync(Guid templateId, Guid organizerId, DateTime scheduledDate, TimeSpan scheduledTime)
        {
            var template = await _templateRepository.GetByIdAsync(templateId);
            if (template == null)
                throw new NotFoundException("Template not found");

            if (!template.IsPublic && template.CreatedBy != organizerId)
                throw new UnauthorizedAccessException("You don't have access to this template");

            // Get user profile to get timezone
            var userProfile = await _userProfileRepository.GetByUserIdAsync(organizerId);
            var userTimezone = userProfile?.Timezone ?? template.Timezone ?? "UTC+00:00";

            // Convert scheduled date and time from user's timezone to UTC
            var (utcDate, utcTime) = ConvertToUtc(scheduledDate, scheduledTime, userTimezone);

            var eventEntity = new Event
            {
                OrganizerId = organizerId,
                Title = template.Title,
                Description = template.EventDescription,
                EventType = template.EventType,
                ScheduledDate = utcDate,
                ScheduledTime = utcTime,
                EstimatedDuration = template.EstimatedDuration,
                ExpectedAttendees = template.ExpectedAttendees,
                MaxAttendees = template.MaxAttendees,
                BudgetTotal = template.BudgetTotal,
                BudgetPerPerson = template.BudgetPerPerson,
                Timezone = userTimezone, // Store user's timezone for reference
                Status = "draft",
                TemplateId = templateId,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            // Validate business rules (after UTC conversion)
            EventBusinessRules.ValidateMinimumAdvanceScheduling(eventEntity);
            EventBusinessRules.ValidateMinimumParticipants(eventEntity);
            EventBusinessRules.ValidateBudget(eventEntity);

            // Check for overlapping events
            var overlappingEvents = await _eventRepository.GetOverlappingEventsAsync(
                organizerId,
                eventEntity.ScheduledDate,
                eventEntity.ScheduledTime,
                eventEntity.EstimatedDuration
            );
            EventBusinessRules.ValidateNoTimeOverlap(overlappingEvents, eventEntity);

            var createdEvent = await _eventRepository.CreateAsync(eventEntity);

            // Increment template usage count
            await _templateRepository.IncrementUsageCountAsync(templateId);

            // Add organizer as participant
            var organizerParticipant = new EventParticipant
            {
                EventId = createdEvent.EventId,
                UserId = organizerId,
                InvitationStatus = "accepted",
                InvitedAt = DateTimeOffset.Now,
                InvitedBy = organizerId,
                RsvpDate = DateTimeOffset.Now
            };
            await _participantRepository.CreateAsync(organizerParticipant);

            return createdEvent;
        }

        // Recurring Events
        public async Task<RecurringEvent> CreateRecurringEventAsync(Guid organizerId, RecurringEvent recurringEvent)
        {
            recurringEvent.OrganizerId = organizerId;
            recurringEvent.Status = "active";
            recurringEvent.CreatedAt = DateTimeOffset.UtcNow;
            recurringEvent.UpdatedAt = DateTimeOffset.UtcNow;
            return await _recurringEventRepository.CreateAsync(recurringEvent);
        }

        public async Task<EventWaitlist?> GetWaitlistByEventAndUserAsync(Guid eventId, Guid userId)
        {
            return await _waitlistRepository.GetByEventAndUserAsync(eventId, userId);
        }

        public async Task<bool> JoinEventWaitlistAsync(Guid eventId, Guid userId, int? priority = null, string? notes = null)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            // Check if already a participant
            var existingParticipant = await _participantRepository.GetByEventAndUserAsync(eventId, userId);
            if (existingParticipant != null)
                throw new InvalidOperationException("You are already a participant");

            // Check if already on waitlist
            var existingWaitlist = await _waitlistRepository.GetByEventAndUserAsync(eventId, userId);
            if (existingWaitlist != null)
                throw new InvalidOperationException("You are already on the waitlist");

            // Check if event has max attendees
            if (eventEntity.MaxAttendees.HasValue)
            {
                var acceptedCount = await _eventRepository.GetAcceptedParticipantsCountAsync(eventId);
                if (acceptedCount >= eventEntity.MaxAttendees.Value)
                {
                    // Event is full, add to waitlist
                    var waitlist = new EventWaitlist
                    {
                        EventId = eventId,
                        UserId = userId,
                        Status = "waiting",
                        Priority = priority ?? 0,
                        Notes = notes,
                        JoinedAt = DateTimeOffset.UtcNow
                    };

                    await _waitlistRepository.CreateAsync(waitlist);
                    return true;
                }
            }

            throw new InvalidOperationException("Event is not full, you can join directly");
        }

        public async Task<bool> PromoteFromWaitlistAsync(Guid eventId, Guid userId, Guid organizerId)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            if (eventEntity.OrganizerId != organizerId)
                throw new UnauthorizedAccessException("Only organizer can promote from waitlist");

            var waitlist = await _waitlistRepository.GetByEventAndUserAsync(eventId, userId);
            if (waitlist == null || waitlist.Status != "waiting")
                throw new NotFoundException("User not found in waitlist");

            // Check if event still has space
            if (eventEntity.MaxAttendees.HasValue)
            {
                var acceptedCount = await _eventRepository.GetAcceptedParticipantsCountAsync(eventId);
                if (acceptedCount >= eventEntity.MaxAttendees.Value)
                    throw new InvalidOperationException("Event is full");
            }

            // Add as participant
            var participant = new EventParticipant
            {
                EventId = eventId,
                UserId = userId,
                InvitationStatus = "accepted",
                InvitedAt = DateTimeOffset.Now,
                InvitedBy = organizerId,
                RsvpDate = DateTimeOffset.Now
            };

            await _participantRepository.CreateAsync(participant);

            // Update waitlist status
            waitlist.Status = "accepted";
            waitlist.RespondedAt = DateTimeOffset.UtcNow;
            await _waitlistRepository.UpdateAsync(waitlist);

            // Notify user
            var notification = new GeneralNotificationMessage
            {
                Title = "Waitlist Promotion",
                Message = $"You have been promoted from waitlist for event '{eventEntity.Title}'",
                Type = NotificationMessageType.DataUpdated.ToString(),
                SenderId = organizerId,
                TargetUserId = userId
            };

            await _notificationService.BoardcastToSpecificUserByIdAsync(notification);

            return true;
        }

        public async Task<List<Event>> GetEventsByBranchIdAsync(Guid branchId)
        {
            return await _eventRepository.GetEventsByBranchIdAsync(branchId);
        }

        public async Task<Event> GetEventWithFullStatisticsAsync(Guid eventId)
        {
            var eventEntity = await _eventRepository.GetByIdWithFullStatisticsAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");
            return eventEntity;
        }

        public async Task<bool> DeleteEventByModeratorAsync(Guid eventId, Guid moderatorId, string reason)
        {
            var eventEntity = await _eventRepository.GetByIdWithDetailsAsync(eventId);
            if (eventEntity == null)
                throw new NotFoundException("Event not found");

            // If already cancelled, just return success
            if (eventEntity.Status == "cancelled")
                return true;

            // Save old status before cancellation
            var oldStatus = eventEntity.Status;

            // Force cancel event regardless of current status (moderator privilege)
            // Directly update event status without state machine validation
            eventEntity.Status = "cancelled";
            eventEntity.CancelledAt = DateTimeOffset.Now;
            eventEntity.CancellationReason = $"Moderator deletion: {reason}";
            eventEntity.UpdatedAt = DateTimeOffset.Now;

            await _eventRepository.UpdateAsync(eventEntity);

            // Log the state transition
            await _auditLogService.LogStateTransitionAsync(
                eventId,
                oldStatus,
                "cancelled",
                $"Deleted by moderator {moderatorId}: {reason}");

            // Get organizer information for notifications
            var organizer = await _userRepository.GetByIdAsync(eventEntity.OrganizerId);
            var organizerName = organizer != null 
                ? $"{organizer.FirstName} {organizer.LastName}".Trim() 
                : "Event Organizer";

            // Get all participants to notify them
            var participants = eventEntity.EventParticipants?.ToList() ?? new List<EventParticipant>();

            // Send email notifications to all participants (fire and forget)
            var emailTasks = new List<Task>();
            foreach (var participant in participants)
            {
                if (participant.User != null && !string.IsNullOrEmpty(participant.User.Email))
                {
                    emailTasks.Add(_emailService.SendEventCancellationEmailAsync(
                        participant.User.Email,
                        eventEntity,
                        organizerName,
                        reason ?? "Deleted by moderator"));
                }
            }

            _ = Task.Run(async () =>
            {
                try
                {
                    await Task.WhenAll(emailTasks);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error sending cancellation emails: {ex.Message}");
                }
            });

            // Send in-app notifications to all participants
            foreach (var participant in participants)
            {
                if (participant.UserId != eventEntity.OrganizerId)
                {
                    try
                    {
                        var notificationMessage = new GeneralNotificationMessage
                        {
                            Title = "Event Cancelled by Moderator",
                            Message = $"Event '{eventEntity.Title}' has been cancelled by a moderator. Reason: {reason ?? "No reason provided"}",
                            Type = NotificationMessageType.DataUpdated.ToString(),
                            SenderId = moderatorId,
                            TargetUserId = participant.UserId
                        };

                        await _notificationService.BoardcastToSpecificUserByIdAsync(notificationMessage);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error sending notification to user {participant.UserId}: {ex.Message}");
                    }
                }
            }

            return true;
        }

        public async Task<UploadResultDto> AddEventImageAsync(Guid eventId, IFormFile imageFile, Guid senderId)
        {
            try
            {
                // Only allow 10 MB image file size
                if (imageFile.Length > 10 * 1024 * 1024)
                {
                    return new UploadResultDto
                    {
                        IsSuccess = false,
                        ErrorMessage = "Image file must not exceed 10MB"
                    };
                }

                var existingEvent = await _eventRepository.GetByIdAsync(eventId);
                if (existingEvent == null)
                {
                    return new UploadResultDto
                    {
                        IsSuccess = false,
                        ErrorMessage = "Event not found"
                    };
                }

                // Check if there is existing Event image URL, if yes delete the old one and upload the new
                var existingImageUrl = existingEvent.EventImageUrl;

                if (!string.IsNullOrEmpty(existingImageUrl))
                {
                    var deletionResult = await _cloudinaryHelper.DeleteImageAsync(existingImageUrl, "events");
                    if (deletionResult.Result != "ok" && deletionResult.Result != "not found")
                    {
                        return new UploadResultDto
                        {
                            IsSuccess = false,
                            ErrorMessage = deletionResult.Error?.Message ?? "Failed to delete old event image from Cloudinary"
                        };
                    }
                }

                // Upload the image to Cloudinary
                var resultDto = await _cloudinaryHelper.UploadSingleImageAsync(imageFile, "events");

                if (!resultDto.IsSuccess)
                {
                    return new UploadResultDto
                    {
                        IsSuccess = false,
                        ErrorMessage = resultDto.ErrorMessage ?? "Unknown error occurred during file upload"
                    };
                }

                // Add the image URL to the event in the database
                await _eventRepository.AddEventImageAsync(eventId, resultDto.FileUrl);

                return new UploadResultDto
                {
                    FileUrl = resultDto.FileUrl,
                    FileName = resultDto.FileName,
                    FileSize = resultDto.FileSize,
                    IsSuccess = true
                };
            }
            catch (Exception ex)
            {
                return new UploadResultDto
                {
                    IsSuccess = false,
                    ErrorMessage = ex.Message ?? "Exception error caught during file upload"
                };
            }
        }

        public async Task<Infrastructure.Models.Common.PagedResult<Event>> GetBranchEventsSummaryAsync(
            Guid userId,
            Guid? branchId = null,
            string? timeFilter = null,
            string? statusFilter = null,
            int page = 1,
            int pageSize = 20)
        {
            // Validate pagination parameters
            if (page < 1)
                throw new ArgumentException("Page must be greater than 0", nameof(page));
            
            if (pageSize < 1 || pageSize > 100)
                throw new ArgumentException("PageSize must be between 1 and 100", nameof(pageSize));

            // Lấy thông tin user
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new NotFoundException("User not found");

            // Lấy branchId của user nếu không được cung cấp
            if (!branchId.HasValue)
            {
                branchId = user.CurrentBranchId;
            }
            else
            {
                // Kiểm tra quyền: Nếu user truyền branchId khác với branch của mình
                // Chỉ cho phép nếu user là Admin hoặc Moderator (RoleId = 1 hoặc 2)
                // TODO: Có thể mở rộng logic kiểm tra quyền chi tiết hơn nếu cần
                if (branchId.Value != user.CurrentBranchId)
                {
                    // Kiểm tra role: Admin (1) hoặc Moderator (2) có thể xem branch khác
                    // RoleId khác chỉ được xem branch của mình
                    if (user.RoleId != 1 && user.RoleId != 2)
                    {
                        throw new UnauthorizedAccessException("You don't have permission to view events from other branches");
                    }
                }
            }

            // Validate branchId không được empty
            if (branchId.Value == Guid.Empty)
                throw new ArgumentException("Invalid branch ID", nameof(branchId));

            // Lấy events với privacy filtering
            var events = await _eventRepository.GetEventsByBranchWithPrivacyAsync(
                branchId.Value,
                userId,
                timeFilter,
                statusFilter,
                page,
                pageSize
            );

            // Lấy tổng số để tính pagination
            var totalCount = await _eventRepository.GetEventsByBranchWithPrivacyCountAsync(
                branchId.Value,
                userId,
                timeFilter,
                statusFilter
            );

            return new Infrastructure.Models.Common.PagedResult<Event>(
                page,
                pageSize,
                totalCount,
                events
            );
        }
    }
}
