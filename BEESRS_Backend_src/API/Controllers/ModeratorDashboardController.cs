using Application.Interfaces;
using Infrastructure.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Models.UserDTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Infrastructure.Persistence;
using Application.Exceptions;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Moderator")]
    public class ModeratorDashboardController : ControllerBase
    {
        private readonly IEventService _eventService;
        private readonly IUserRepository _userRepository;
        private readonly IModeratorDashboardService _moderatorService;
        private readonly BEESRSDBContext _context;

        public ModeratorDashboardController(
            IEventService eventService,
            IUserRepository userRepository,
            IModeratorDashboardService moderatorService,
            BEESRSDBContext context)
        {
            _eventService = eventService;
            _userRepository = userRepository;
            _moderatorService = moderatorService;
            _context = context;
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                ?? User.FindFirst("UserId")?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim))
            {
                throw new UnauthorizedAccessException("User ID not found in token");
            }
            
            if (!Guid.TryParse(userIdClaim, out var userId))
            {
                throw new ArgumentException("Invalid user ID format");
            }
            
            return userId;
        }

        /// <summary>
        /// Get events in moderator's branch/area
        /// </summary>
        [HttpGet("events")]
        public async Task<ActionResult<PagedResult<object>>> GetEventsInArea(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? status = null,
            [FromQuery] string? search = null)
        {
            try
            {
                var moderatorId = GetCurrentUserId();
                var moderator = await _userRepository.GetByIdAsync(moderatorId);
                
                if (moderator == null)
                    return NotFound(new { message = "Moderator not found" });

                // Get moderator's branch (prefer CurrentBranchId, fallback to BranchId)
                var branchId = moderator.CurrentBranchId;
             
                var events = await _eventService.GetEventsByBranchIdAsync(branchId);
                
                // Debug logging
                System.Diagnostics.Debug.WriteLine($"Moderator {moderatorId} (Branch: {branchId}) found {events.Count} events before filters");

                // Apply filters
                if (!string.IsNullOrEmpty(status))
                {
                    events = events.Where(e => e.Status.ToLower() == status.ToLower()).ToList();
                }

                if (!string.IsNullOrEmpty(search))
                {
                    var searchLower = search.ToLower();
                    events = events.Where(e => 
                        e.Title.ToLower().Contains(searchLower) ||
                        (e.Description != null && e.Description.ToLower().Contains(searchLower)) ||
                        (e.Organizer != null && (e.Organizer.FirstName + " " + e.Organizer.LastName).ToLower().Contains(searchLower))
                    ).ToList();
                }

                // Apply pagination
                var totalItems = events.Count;
                var pagedEvents = events
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(e => new
                    {
                        eventId = e.EventId,
                        title = e.Title,
                        description = e.Description,
                        eventType = e.EventType,
                        scheduledDate = e.ScheduledDate,
                        scheduledTime = e.ScheduledTime,
                        status = e.Status,
                        organizerId = e.OrganizerId,
                        organizerName = e.Organizer != null ? $"{e.Organizer.FirstName} {e.Organizer.LastName}" : null,
                        organizerEmail = e.Organizer?.Email,
                        expectedAttendees = e.ExpectedAttendees,
                        maxAttendees = e.MaxAttendees,
                        acceptedParticipantsCount = e.EventParticipants?.Count(ep => ep.InvitationStatus == "accepted") ?? 0,
                        totalParticipantsCount = e.EventParticipants?.Count ?? 0,
                        finalPlaceId = e.FinalPlaceId,
                        finalPlaceName = e.FinalPlace?.Name,
                        createdAt = e.CreatedAt,
                        updatedAt = e.UpdatedAt,
                        confirmedAt = e.ConfirmedAt,
                        cancelledAt = e.CancelledAt,
                        completedAt = e.CompletedAt
                    })
                    .ToList();

                var result = new PagedResult<object>(page, pageSize, totalItems, pagedEvents);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get users in moderator's branch/area
        /// </summary>
        [HttpGet("users")]
        public async Task<ActionResult<PagedResult<UserListItemDto>>> GetUsersInArea(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] bool? isActive = null)
        {
            try
            {
                var moderatorId = GetCurrentUserId();
                var req = new PagedRequest(page, pageSize, search, null, isActive);
                var result = await _moderatorService.GetUsersInBranchAsync(moderatorId, req);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Toggle user active status in moderator's branch
        /// </summary>
        [HttpPut("users/{userId}/toggle-status")]
        public async Task<IActionResult> ToggleUserStatus(Guid userId)
        {
            try
            {
                var moderatorId = GetCurrentUserId();
                await _moderatorService.ToggleUserStatusAsync(moderatorId, userId);
                return Ok(new { message = "User status toggled successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Get user details in moderator's branch
        /// </summary>
        [HttpGet("users/{userId}")]
        public async Task<ActionResult<UserInfoDto>> GetUserDetails(Guid userId)
        {
            try
            {
                var moderatorId = GetCurrentUserId();
                var result = await _moderatorService.GetUserDetailsAsync(moderatorId, userId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Get full analytics for moderator's branch
        /// </summary>
        [HttpGet("analytics")]
        public async Task<ActionResult<ModeratorAnalyticsDto>> GetAnalytics()
        {
            try
            {
                var moderatorId = GetCurrentUserId();
                var result = await _moderatorService.GetAnalyticsAsync(moderatorId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Get dashboard statistics for moderator
        /// </summary>
        [HttpGet("statistics")]
        public async Task<ActionResult<object>> GetDashboardStatistics()
        {
            try
            {
                var moderatorId = GetCurrentUserId();
                var moderator = await _userRepository.GetByIdAsync(moderatorId);
                
                if (moderator == null)
                    return NotFound(new { message = "Moderator not found" });

                var branchId = moderator.CurrentBranchId;
                
                var events = await _eventService.GetEventsByBranchIdAsync(branchId);

                var statistics = new
                {
                    totalEvents = events.Count,
                    upcomingEvents = events.Count(e => e.ScheduledDate >= DateTime.Now && 
                        (e.Status == "confirmed" || e.Status == "voting" || e.Status == "inviting")),
                    completedEvents = events.Count(e => e.Status == "completed"),
                    cancelledEvents = events.Count(e => e.Status == "cancelled"),
                    eventsByStatus = events.GroupBy(e => e.Status)
                        .ToDictionary(g => g.Key, g => g.Count())
                };

                return Ok(statistics);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get event details with full statistics for moderator
        /// </summary>
        [HttpGet("events/{eventId}")]
        public async Task<ActionResult<object>> GetEventDetails(Guid eventId)
        {
            try
            {
                var moderatorId = GetCurrentUserId();
                var moderator = await _userRepository.GetByIdAsync(moderatorId);
                
                if (moderator == null)
                    return NotFound(new { message = "Moderator not found" });

                var branchId = moderator.CurrentBranchId;
                
                var eventEntity = await _eventService.GetEventWithFullStatisticsAsync(eventId);

                // Verify event belongs to moderator's branch
                var eventsInBranch = await _eventService.GetEventsByBranchIdAsync(branchId);
                if (!eventsInBranch.Any(e => e.EventId == eventId))
                {
                    return Forbid("You don't have permission to view this event");
                }

                // Calculate statistics
                var acceptedParticipants = eventEntity.EventParticipants?.Count(ep => ep.InvitationStatus == "accepted") ?? 0;
                var pendingParticipants = eventEntity.EventParticipants?.Count(ep => ep.InvitationStatus == "pending") ?? 0;
                var declinedParticipants = eventEntity.EventParticipants?.Count(ep => ep.InvitationStatus == "declined") ?? 0;
                var totalCheckIns = eventEntity.EventCheckIns?.Count ?? 0;
                var totalFeedbacks = eventEntity.EventFeedbacks?.Count ?? 0;
                var totalVotes = eventEntity.EventVotes?.Count ?? 0;
                var totalWaitlist = eventEntity.EventWaitlists?.Count(w => w.Status == "waiting") ?? 0;

                var averageVenueRating = eventEntity.EventFeedbacks?.Any() == true
                    ? eventEntity.EventFeedbacks.Average(f => f.VenueRating)
                    : 0;
                var averageFoodRating = eventEntity.EventFeedbacks?.Any() == true
                    ? eventEntity.EventFeedbacks.Average(f => f.FoodRating)
                    : 0;
                var averageOverallRating = eventEntity.EventFeedbacks?.Any() == true
                    ? eventEntity.EventFeedbacks.Average(f => f.OverallRating)
                    : 0;

                var response = new
                {
                    eventId = eventEntity.EventId,
                    title = eventEntity.Title,
                    description = eventEntity.Description,
                    eventType = eventEntity.EventType,
                    scheduledDate = eventEntity.ScheduledDate,
                    scheduledTime = eventEntity.ScheduledTime,
                    timezone = eventEntity.Timezone,
                    estimatedDuration = eventEntity.EstimatedDuration,
                    status = eventEntity.Status,
                    organizerId = eventEntity.OrganizerId,
                    organizerName = eventEntity.Organizer != null ? $"{eventEntity.Organizer.FirstName} {eventEntity.Organizer.LastName}" : null,
                    organizerEmail = eventEntity.Organizer?.Email,
                    expectedAttendees = eventEntity.ExpectedAttendees,
                    maxAttendees = eventEntity.MaxAttendees,
                    budgetTotal = eventEntity.BudgetTotal,
                    budgetPerPerson = eventEntity.BudgetPerPerson,
                    finalPlaceId = eventEntity.FinalPlaceId,
                    finalPlaceName = eventEntity.FinalPlace?.Name,
                    finalPlaceAddress = eventEntity.FinalPlace != null 
                        ? $"{eventEntity.FinalPlace.AddressLine1}, {eventEntity.FinalPlace.City}" 
                        : null,
                    createdAt = eventEntity.CreatedAt,
                    updatedAt = eventEntity.UpdatedAt,
                    confirmedAt = eventEntity.ConfirmedAt,
                    cancelledAt = eventEntity.CancelledAt,
                    completedAt = eventEntity.CompletedAt,
                    cancellationReason = eventEntity.CancellationReason,
                    rescheduleCount = eventEntity.RescheduleCount,
                    statistics = new
                    {
                        participants = new
                        {
                            accepted = acceptedParticipants,
                            pending = pendingParticipants,
                            declined = declinedParticipants,
                            total = eventEntity.EventParticipants?.Count ?? 0
                        },
                        checkIns = totalCheckIns,
                        checkInRate = acceptedParticipants > 0 ? (double)totalCheckIns / acceptedParticipants * 100 : 0,
                        feedbacks = totalFeedbacks,
                        feedbackRate = acceptedParticipants > 0 ? (double)totalFeedbacks / acceptedParticipants * 100 : 0,
                        votes = totalVotes,
                        waitlist = totalWaitlist,
                        ratings = new
                        {
                            venue = Math.Round(averageVenueRating, 2),
                            food = Math.Round(averageFoodRating, 2),
                            overall = Math.Round(averageOverallRating, 2)
                        },
                        placeOptions = eventEntity.EventPlaceOptions?.Count ?? 0
                    },
                    participants = eventEntity.EventParticipants != null
                        ? eventEntity.EventParticipants.Select(ep => (object)new
                        {
                            userId = ep.UserId,
                            userName = ep.User != null ? $"{ep.User.FirstName} {ep.User.LastName}" : null,
                            userEmail = ep.User?.Email,
                            status = ep.InvitationStatus,
                            rsvpDate = ep.RsvpDate,
                            invitedAt = ep.InvitedAt
                        }).ToList()
                        : new List<object>(),
                    checkIns = eventEntity.EventCheckIns != null
                        ? eventEntity.EventCheckIns.Select(ci => (object)new
                        {
                            userId = ci.UserId,
                            userName = ci.User != null ? $"{ci.User.FirstName} {ci.User.LastName}" : null,
                            checkedInAt = ci.CheckedInAt,
                            checkInMethod = ci.CheckInMethod
                        }).ToList()
                        : new List<object>(),
                    feedbacks = eventEntity.EventFeedbacks != null
                        ? eventEntity.EventFeedbacks.Select(f => (object)new
                        {
                            userId = f.UserId,
                            userName = f.User != null ? $"{f.User.FirstName} {f.User.LastName}" : null,
                            venueRating = f.VenueRating,
                            foodRating = f.FoodRating,
                            overallRating = f.OverallRating,
                            comments = f.Comments,
                            suggestions = f.Suggestions,
                            wouldAttendAgain = f.WouldAttendAgain,
                            submittedAt = f.SubmittedAt
                        }).ToList()
                        : new List<object>()
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        /// <summary>
        /// Delete (cancel) event by moderator
        /// </summary>
        [HttpDelete("events/{eventId}")]
        public async Task<ActionResult> DeleteEvent(Guid eventId, [FromBody] DeleteEventRequest? request = null)
        {
            try
            {
                var moderatorId = GetCurrentUserId();
                var moderator = await _userRepository.GetByIdAsync(moderatorId);
                
                if (moderator == null)
                    return NotFound(new { message = "Moderator not found" });

                var branchId = moderator.CurrentBranchId;
                
                // Verify event belongs to moderator's branch
                var eventsInBranch = await _eventService.GetEventsByBranchIdAsync(branchId);
                if (!eventsInBranch.Any(e => e.EventId == eventId))
                {
                    return Forbid("You don't have permission to delete this event");
                }

                var reason = request?.Reason ?? "Deleted by moderator";
                await _eventService.DeleteEventByModeratorAsync(eventId, moderatorId, reason);

                return Ok(new { message = "Event deleted successfully" });
            }
            catch (NotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                // Log the full exception for debugging
                System.Diagnostics.Debug.WriteLine($"Error deleting event {eventId}: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    System.Diagnostics.Debug.WriteLine($"Inner exception: {ex.InnerException.Message}");
                }
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }
    }

    public class DeleteEventRequest
    {
        public string? Reason { get; set; }
    }
}

