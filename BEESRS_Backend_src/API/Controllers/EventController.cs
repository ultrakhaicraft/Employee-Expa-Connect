using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Application.Interfaces;
using Application.Interfaces.ThirdParty;
using Domain.Entities;
using Infrastructure.Interfaces;
using Infrastructure.Models;
using Infrastructure.Models.Common;
using Infrastructure.Models.EventShareDTO;
using Application.Exceptions;

namespace API.Controllers
{
	[ApiController]
	[Route("api/[controller]")]
	[Authorize]
	public class EventController : ControllerBase
	{
		private readonly IEventService _eventService;
		private readonly IPreferenceAggregationService _preferenceService;
		private readonly IAIRecommendationService _aiService;
		private readonly IVoteService _voteService;
		private readonly IEventStateMachine _stateMachine;
		private readonly IEventShareService _eventShareService;
		private readonly Application.Interfaces.ThirdParty.ITrackAsiaService _trackAsiaService;
		private readonly IEventAnalyticsService _analyticsService;
		private readonly IEventTemplateRepository _templateRepository;
		private readonly IRecurringEventRepository _recurringEventRepository;
		private readonly IEventWaitlistRepository _waitlistRepository;
		private readonly Application.Interfaces.IConverstationService _conversationService;
		private readonly IAIService _aiServiceForImage;
		private readonly IImageGenerationService _imageGenerationService;
		private readonly ICloudinaryHelper _cloudinaryHelper;

		public EventController(
			IEventService eventService,
			IPreferenceAggregationService preferenceService,
			IAIRecommendationService aiService,
			IVoteService voteService,
			IEventStateMachine stateMachine,
			IEventShareService eventShareService,
			Application.Interfaces.ThirdParty.ITrackAsiaService trackAsiaService,
			IEventAnalyticsService analyticsService,
			IEventTemplateRepository templateRepository,
			IRecurringEventRepository recurringEventRepository,
			IEventWaitlistRepository waitlistRepository,
			Application.Interfaces.IConverstationService conversationService,
			IAIService aiServiceForImage,
			IImageGenerationService imageGenerationService,
			ICloudinaryHelper cloudinaryHelper)
		{
			_eventService = eventService;
			_preferenceService = preferenceService;
			_aiService = aiService;
			_voteService = voteService;
			_stateMachine = stateMachine;
			_eventShareService = eventShareService;
			_trackAsiaService = trackAsiaService;
			_analyticsService = analyticsService;
			_templateRepository = templateRepository;
			_recurringEventRepository = recurringEventRepository;
			_waitlistRepository = waitlistRepository;
			_conversationService = conversationService;
			_aiServiceForImage = aiServiceForImage;
			_imageGenerationService = imageGenerationService;
			_cloudinaryHelper = cloudinaryHelper;
		}

		private Guid GetCurrentUserId()
		{
			var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
				?? User.FindFirst("UserId")?.Value;
			return Guid.Parse(userIdClaim);
		}

		// POST: api/Event
		[HttpPost]
		public async Task<ActionResult<EventResponse>> CreateEvent([FromBody] CreateEventRequest request)
		{
			try
			{
				var userId = GetCurrentUserId();
				var eventEntity = new Event
				{
					Title = request.Title,
					Description = request.Description,
					EventType = request.EventType,
					ScheduledDate = request.ScheduledDate,
					ScheduledTime = request.ScheduledTime,
					ExpectedAttendees = request.ExpectedAttendees,
					BudgetTotal = request.BudgetTotal,
					BudgetPerPerson = request.BudgetPerPerson,
					EstimatedDuration = request.EstimatedDuration,
					EventImageUrl = request.EventImageUrl ?? string.Empty,
					FinalPlaceId = request.FinalPlaceId, // Optional: if provided, organizer selects place directly
					AcceptanceThreshold = request.AcceptanceThreshold, // Optional: custom acceptance threshold (default 0.7)
					Privacy = string.IsNullOrWhiteSpace(request.Privacy) ? "Public" : request.Privacy // Privacy setting
				};

				var createdEvent = await _eventService.CreateEventAsync(userId, eventEntity);
				return Ok(MapToEventResponse(createdEvent));
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// PUT: api/Event/{id}
		[HttpPut("{id}")]
		public async Task<ActionResult<EventResponse>> UpdateEvent(Guid id, [FromBody] UpdateEventRequest request)
		{
			try
			{
				var eventEntity = await _eventService.GetEventByIdAsync(id);
				if (eventEntity == null)
					throw new NotFoundException("Event not found");
				
				// Update fields
				eventEntity.Title = request.Title;
				eventEntity.Description = request.Description;
				eventEntity.EventType = request.EventType;
				eventEntity.ScheduledDate = request.ScheduledDate;
				eventEntity.ScheduledTime = request.ScheduledTime;
				eventEntity.ExpectedAttendees = request.ExpectedAttendees;
				eventEntity.BudgetTotal = request.BudgetTotal;
				eventEntity.BudgetPerPerson = request.BudgetPerPerson;
				eventEntity.EstimatedDuration = request.EstimatedDuration;
				if (!string.IsNullOrEmpty(request.EventImageUrl))
					eventEntity.EventImageUrl = request.EventImageUrl;
				if (!string.IsNullOrWhiteSpace(request.Privacy))
					eventEntity.Privacy = request.Privacy;

				var updatedEvent = await _eventService.UpdateEventAsync(id, eventEntity);
				return Ok(MapToEventResponse(updatedEvent));
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// GET: api/Event/{id}
		[HttpGet("{id}")]
		public async Task<ActionResult<EventResponse>> GetEvent(Guid id)
		{
			try
			{
				var eventEntity = await _eventService.GetEventByIdAsync(id);
				return Ok(MapToEventResponse(eventEntity));
			}
			catch (Exception ex)
			{
				return NotFound(new { message = ex.Message });
			}
		}

		// GET: api/Event/my-events
		[HttpGet("my-events")]
		public async Task<ActionResult<List<EventResponse>>> GetMyEvents()
		{
			try
			{
				var userId = GetCurrentUserId();
				var events = await _eventService.GetEventsByOrganizerAsync(userId);
				var response = events.Select(e => MapToEventResponse(e)).ToList();
				return Ok(response);
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// GET: api/Event/participating
		[HttpGet("participating")]
		public async Task<ActionResult<List<EventResponse>>> GetParticipatingEvents()
		{
			try
			{
				var userId = GetCurrentUserId();
				var events = await _eventService.GetEventsByParticipantAsync(userId);
				var response = events.Select(e => MapToEventResponse(e)).ToList();
				return Ok(response);
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// GET: api/Event/branch-summary
		[HttpGet("branch-summary")]
		public async Task<ActionResult<PagedResult<EventResponse>>> GetBranchEventsSummary(
			[FromQuery] Guid? branchId = null,
			[FromQuery] string? timeFilter = null, // "Upcoming" hoặc "Past"
			[FromQuery] string? statusFilter = null,
			[FromQuery] int page = 1,
			[FromQuery] int pageSize = 20)
		{
			try
			{
				var userId = GetCurrentUserId();
				
				var result = await _eventService.GetBranchEventsSummaryAsync(
					userId,
					branchId,
					timeFilter,
					statusFilter,
					page,
					pageSize
				);

				var response = new PagedResult<EventResponse>(
					result.Page,
					result.PageSize,
					result.TotalItems,
					result.Items.Select(e => MapToEventResponse(e)).ToList()
				);

				return Ok(response);
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// POST: api/Event/{id}/invite
		[HttpPost("{id}/invite")]
		public async Task<ActionResult> InviteParticipants(Guid id, [FromBody] InviteParticipantsRequest request)
		{
			try
			{
				var userId = GetCurrentUserId();
				
				// Check if event exists and user is the organizer
				var eventEntity = await _eventService.GetEventByIdAsync(id);
				if (eventEntity.OrganizerId != userId)
				{
					return StatusCode(403, new { message = "Only the event organizer can invite participants" });
				}
				
				await _eventService.InviteParticipantsAsync(id, request.UserIds, userId);
				return Ok(new { message = "Invitations sent successfully" });
			}
			catch (NotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// POST: api/Event/{id}/accept
		[HttpPost("{id}/accept")]
		public async Task<ActionResult> AcceptInvitation(Guid id)
		{
			try
			{
				var userId = GetCurrentUserId();
				await _eventService.AcceptInvitationAsync(id, userId);
				return Ok(new { message = "Invitation accepted" });
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// POST: api/Event/{id}/decline
		[HttpPost("{id}/decline")]
		public async Task<ActionResult> DeclineInvitation(Guid id)
		{
			try
			{
				var userId = GetCurrentUserId();
				await _eventService.DeclineInvitationAsync(id, userId);
				return Ok(new { message = "Invitation declined" });
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// POST: api/Event/{id}/request-join
		[HttpPost("{id}/request-join")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> RequestToJoin(Guid id)
		{
			try
			{
				var userId = GetCurrentUserId();
				await _eventService.RequestToJoinAsync(id, userId);
				return Ok(new { message = "Request to join sent successfully" });
			}
			catch (NotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (InvalidOperationException ex)
			{
				return BadRequest(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// DELETE: api/Event/{id}/participants/{participantId}
		[HttpDelete("{id}/participants/{participantId}")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> RemoveParticipant(Guid id, Guid participantId)
		{
			try
			{
				var userId = GetCurrentUserId();
				await _eventService.RemoveParticipantAsync(id, participantId, userId);
				return Ok(new { message = "Participant removed successfully" });
			}
			catch (NotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (UnauthorizedAccessException ex)
			{
				return StatusCode(403, new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// POST: api/Event/{id}/generate-recommendations
		[HttpPost("{id}/generate-recommendations")]
		public async Task<ActionResult> GenerateRecommendations(
			Guid id,
			[FromBody] GenerateRecommendationsRequest request = null)
		{
			try
			{
				var eventEntity = await _eventService.GetEventByIdAsync(id);
				
				// Transition to gathering_preferences if needed
				if (eventEntity.Status == "inviting")
				{
					await _stateMachine.TransitionToAsync(eventEntity, "gathering_preferences");
					eventEntity = await _eventService.GetEventByIdAsync(id); // Refresh after transition
				}

				// Gather preferences
				var preferences = await _preferenceService.AggregatePreferencesAsync(id);

				// Transition to ai_recommending only if not already in that state
				if (eventEntity.Status != "ai_recommending")
				{
					await _stateMachine.TransitionToAsync(eventEntity, "ai_recommending", "AI generate");
					eventEntity = await _eventService.GetEventByIdAsync(id); // Refresh after transition
				}

				// Generate recommendations with optional location and radius
				var recommendations = await _aiService.GenerateRecommendationsAsync(
					id, 
					preferences,
					request?.Latitude,
					request?.Longitude,
					request?.RadiusKm);

				// Check if we have any recommendations before transitioning
				if (recommendations == null || recommendations.Count == 0)
				{
					return BadRequest(new { message = "No recommendations were generated. Please try again or adjust your search criteria." });
				}

				// Refresh event entity to get latest state
				eventEntity = await _eventService.GetEventByIdAsync(id);

				// Transition to voting
				try
				{
					await _stateMachine.TransitionToAsync(eventEntity, "voting", "AI generate");
				}
				catch (InvalidOperationException ex)
				{
					// Log the error but still return success if recommendations were created
					// This allows the frontend to see recommendations even if state transition fails
					// The state will be corrected on next event fetch
					return Ok(new { 
						message = $"Recommendations generated successfully ({recommendations.Count} recommendations), but state transition failed: {ex.Message}", 
						count = recommendations.Count,
						warning = "State transition failed, but recommendations are available"
					});
				}

				return Ok(new { message = "Recommendations generated successfully", count = recommendations.Count });
			}
			catch (InvalidOperationException ex)
			{
				// Handle state transition errors specifically
				return BadRequest(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = $"Failed to generate recommendations: {ex.Message}" });
			}
		}

		// Request model for generate recommendations
		public class GenerateRecommendationsRequest
		{
			public double? Latitude { get; set; }
			public double? Longitude { get; set; }
			public double? RadiusKm { get; set; }
		}

		// GET: api/Event/{id}/recommendations
		[HttpGet("{id}/recommendations")]
		public async Task<ActionResult<List<VenueOptionResponse>>> GetRecommendations(Guid id)
		{
			try
			{
				var userId = GetCurrentUserId();
				var eventEntity = await _eventService.GetEventByIdAsync(id);

				// Optional authorization check for viewing recommendations
				var isOrganizer = eventEntity.OrganizerId == userId;
				var isParticipant = eventEntity.EventParticipants?
					.Any(ep => ep.UserId == userId && ep.InvitationStatus == "accepted") ?? false;

				if (!isOrganizer && !isParticipant)
				{
					return StatusCode(403, new { message = "You are not allowed to view recommendations for this event" });
				}

				// Only allow viewing recommendations once AI has run or event is finalized
				var allowedStatuses = new[] { "ai_recommending", "voting", "confirmed", "completed" };
				if (!allowedStatuses.Contains(eventEntity.Status))
				{
					return BadRequest(new { message = "Recommendations are only available after the AI recommendation step" });
				}

				// Aggregate vote information for each option
				var voteLookup = (eventEntity.EventVotes ?? new List<EventVote>())
					.GroupBy(ev => ev.OptionId)
					.ToDictionary(
						g => g.Key,
						g => new
						{
							TotalVotes = g.Count(),
							VoteScore = g.Sum(v => v.VoteValue ?? 0)
						});

				var options = eventEntity.EventPlaceOptions
					.Select(epo =>
					{
						voteLookup.TryGetValue(epo.OptionId, out var voteInfo);

						// ✅ Determine if this is internal (Place) or external (TrackAsia/etc.)
						var isExternal = epo.PlaceId == null && !string.IsNullOrEmpty(epo.ExternalProvider);

						return new VenueOptionResponse
						{
							OptionId = epo.OptionId,
							
							// Internal Place data (if exists)
							PlaceId = epo.PlaceId,
							PlaceName = epo.Place?.Name ?? epo.ExternalPlaceName, // Fallback to external if no internal
							PlaceAddress = epo.Place?.AddressLine1 ?? epo.ExternalAddress,
							PlaceCategory = epo.Place?.PlaceCategory?.Name ?? epo.ExternalCategory,
							AverageRating = epo.Place?.AverageRating ?? epo.ExternalRating,
							TotalReviews = epo.Place?.TotalReviews ?? epo.ExternalTotalReviews ?? 0,
							PlaceLatitude = epo.Place?.Latitude,
							PlaceLongitude = epo.Place?.Longitude,
							// Get primary image or first image for system places
							PlaceImageUrl = epo.PlaceId != null && epo.Place?.PlaceImages != null && epo.Place.PlaceImages.Any()
								? (epo.Place.PlaceImages.FirstOrDefault(img => img.IsPrimary)?.ImageUrl 
									?? epo.Place.PlaceImages.OrderBy(img => img.SortOrder).FirstOrDefault()?.ImageUrl)
								: null,
							
							// External Provider data (if external)
							ExternalProvider = epo.ExternalProvider,
							ExternalPlaceId = epo.ExternalPlaceId,
							ExternalPlaceName = epo.ExternalPlaceName,
							ExternalAddress = epo.ExternalAddress,
							ExternalLatitude = epo.ExternalLatitude,
							ExternalLongitude = epo.ExternalLongitude,
							ExternalRating = epo.ExternalRating,
							ExternalTotalReviews = epo.ExternalTotalReviews,
							ExternalPhoneNumber = epo.ExternalPhoneNumber,
							ExternalWebsite = epo.ExternalWebsite,
							ExternalPhotoUrl = epo.ExternalPhotoUrl,
							ExternalCategory = epo.ExternalCategory,
							
							// AI Analysis & Voting (common for both)
							AiScore = epo.AiScore,
							AiReasoning = epo.AiReasoning,
							Pros = string.IsNullOrEmpty(epo.Pros) ? new List<string>() : JsonSerializer.Deserialize<List<string>>(epo.Pros),
							Cons = string.IsNullOrEmpty(epo.Cons) ? new List<string>() : JsonSerializer.Deserialize<List<string>>(epo.Cons),
							EstimatedCostPerPerson = epo.EstimatedCostPerPerson,
							TotalVotes = voteInfo?.TotalVotes ?? 0,
							VoteScore = voteInfo?.VoteScore ?? 0,
							
							// Place Verification Status (only for internal places)
							VerificationStatus = epo.PlaceId != null ? epo.Place?.VerificationStatus.ToString() : null
						};
					})
					// Priority order: System places first, then external places
					// Within each group: Sort by AI score, then by rating/reviews
					.OrderByDescending(o => o.PlaceId != null)                // System places (with PlaceId) first
					.ThenByDescending(o => o.AiScore.HasValue)                // AI options before manual
					.ThenByDescending(o => o.AiScore ?? 0)                     // Higher AI score first
					.ThenByDescending(o => o.PlaceId != null ? (o.AverageRating ?? 0) : (o.ExternalRating ?? 0))  // Higher rating first
					.ThenByDescending(o => o.PlaceId != null ? o.TotalReviews : (o.ExternalTotalReviews ?? 0))    // More reviews first
					.ThenBy(o => o.PlaceName ?? o.ExternalPlaceName)          // Stable ordering (internal or external name)
					.ToList();

				return Ok(options);
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// POST: api/Event/{id}/vote
		[HttpPost("{id}/vote")]
		public async Task<ActionResult> Vote(Guid id, [FromBody] VoteRequest request)
		{
			try
			{
				var userId = GetCurrentUserId();
				await _voteService.CastVoteAsync(id, request.OptionId, userId, request.VoteValue, request.Comment);
				return Ok(new { message = "Vote recorded successfully" });
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// GET: api/Event/{id}/votes
		[HttpGet("{id}/votes")]
		public async Task<ActionResult<VoteStatisticsResponse>> GetVotes(Guid id)
		{
			try
			{
				var eventEntity = await _eventService.GetEventByIdAsync(id);
				var voteStats = await _voteService.GetVoteStatisticsAsync(id);
				
				var totalParticipants = eventEntity.EventParticipants.Count(ep => ep.InvitationStatus == "accepted");
				var votedUserIds = eventEntity.EventVotes.Select(ev => ev.VoterId).Distinct().Count();

				var response = new VoteStatisticsResponse
				{
					TotalParticipants = totalParticipants,
					VotedCount = votedUserIds,
					VoteProgress = totalParticipants > 0 ? (double)votedUserIds / totalParticipants * 100 : 0,
					VenueVotes = voteStats.Select(kvp => new VenueVoteCount
					{
						OptionId = kvp.Key,
						VoteScore = kvp.Value
					}).ToList()
				};

				if (eventEntity.VotingDeadline.HasValue)
				{
					response.TimeRemaining = eventEntity.VotingDeadline.Value - DateTimeOffset.Now;
				}

				return Ok(response);
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// POST: api/Event/{id}/finalize
		[HttpPost("{id}/finalize")]
		public async Task<ActionResult> FinalizeEvent(Guid id, [FromBody] FinalizeEventRequest request)
		{
			try
			{
				var userId = GetCurrentUserId();
				await _eventService.FinalizeEventAsync(id, request.OptionId, userId);
				return Ok(new { message = "Event finalized successfully" });
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// POST: api/Event/{id}/cancel
		[HttpPost("{id}/cancel")]
		public async Task<ActionResult> CancelEvent(Guid id, [FromBody] CancelEventRequest request)
		{
			try
			{
				var userId = GetCurrentUserId();
				
				// Check if event exists and user is the organizer
				var eventEntity = await _eventService.GetEventByIdAsync(id);
				if (eventEntity.OrganizerId != userId)
				{
					return StatusCode(403, new { message = "Only the event organizer can cancel this event" });
				}
				
				await _eventService.CancelEventAsync(id, request.Reason);
				return Ok(new { message = "Event cancelled successfully" });
			}
			catch (NotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// GET: api/Event/{id}/chat
		[HttpGet("{id}/chat")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> GetEventChat(Guid id)
		{
			try
			{
				var userId = GetCurrentUserId();
				var conversation = await _eventService.GetOrCreateEventChatAsync(id, userId);
				return Ok(conversation);
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// GET: api/Event/{id}/chat/messages
		[HttpGet("{id}/chat/messages")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> GetEventChatMessages(Guid id, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 50)
		{
			try
			{
				var userId = GetCurrentUserId();
				var conversation = await _eventService.GetOrCreateEventChatAsync(id, userId);
				var messages = await _conversationService.GetConversationMessagesAsync(conversation.ConversationId, userId, pageNumber, pageSize);
				return Ok(messages);
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// POST: api/Event/{id}/chat/messages/upload-media
		[HttpPost("{id}/chat/messages/upload-media")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> UploadEventChatMedia(Guid id, IFormFile file)
		{
			try
			{
				if (file == null || file.Length == 0)
				{
					return BadRequest(new { message = "No file uploaded" });
				}

				var userId = GetCurrentUserId();
				var conversation = await _eventService.GetOrCreateEventChatAsync(id, userId);

				// Determine if it's image or video
				var isVideo = file.ContentType.StartsWith("video/");
				var isImage = file.ContentType.StartsWith("image/");

				if (!isImage && !isVideo)
				{
					return BadRequest(new { message = "Only image and video files are allowed" });
				}

				// Upload to Cloudinary
				UploadResultDto uploadResult;
				if (isVideo)
				{
					uploadResult = await _cloudinaryHelper.UploadVideoAsync(file, "messages");
				}
				else
				{
					uploadResult = await _cloudinaryHelper.UploadSingleImageAsync(file, "messages");
				}

				if (!uploadResult.IsSuccess)
				{
					return StatusCode(500, new { message = uploadResult.ErrorMessage ?? "Failed to upload media" });
				}

				return Ok(new
				{
					fileUrl = uploadResult.FileUrl,
					fileName = uploadResult.FileName,
					fileSize = uploadResult.FileSize,
					fileMimeType = file.ContentType
				});
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// POST: api/Event/{id}/chat/messages
		[HttpPost("{id}/chat/messages")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> SendEventChatMessage(Guid id, [FromBody] Infrastructure.Models.Converstation.SendMessageDto dto)
		{
			try
			{
				// Validate DTO
				if (dto == null)
				{
					return BadRequest(new { message = "Message data is required" });
				}

				// For media messages, FileUrl is required instead of MessageContent
				if (dto.MessageType == "image" || dto.MessageType == "video")
				{
					if (string.IsNullOrWhiteSpace(dto.FileUrl))
					{
						return BadRequest(new { message = "File URL is required for media messages" });
					}
					// Set MessageContent to FileUrl if not provided
					if (string.IsNullOrWhiteSpace(dto.MessageContent))
					{
						dto.MessageContent = dto.FileUrl;
					}
				}
				else if (string.IsNullOrWhiteSpace(dto.MessageContent))
				{
					return BadRequest(new { message = "Message content is required" });
				}

				var userId = GetCurrentUserId();
				var conversation = await _eventService.GetOrCreateEventChatAsync(id, userId);
				
				// Set conversation ID from event
				dto.ConversationId = conversation.ConversationId;
				
				// Set message type if not provided
				if (string.IsNullOrWhiteSpace(dto.MessageType))
				{
					dto.MessageType = "text";
				}

				var message = await _conversationService.SendMessageAsync(userId, dto);
				return Ok(message);
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// POST: api/Event/{id}/add-place-option
		[HttpPost("{id}/add-place-option")]
		public async Task<ActionResult<VenueOptionResponse>> AddPlaceOption(Guid id, [FromBody] AddPlaceOptionRequest request)
		{
			try
			{
				var userId = GetCurrentUserId();
				var placeOption = await _eventService.AddManualPlaceOptionAsync(id, request.PlaceId, userId);
				
				var eventEntity = await _eventService.GetEventByIdAsync(id);
				var place = eventEntity.EventPlaceOptions.FirstOrDefault(epo => epo.OptionId == placeOption.OptionId)?.Place;

				var response = new VenueOptionResponse
				{
					OptionId = placeOption.OptionId,
					PlaceId = placeOption.PlaceId,
					PlaceName = place?.Name,
					PlaceAddress = place?.AddressLine1,
					PlaceCategory = place?.PlaceCategory?.Name,
					AverageRating = place?.AverageRating,
					TotalReviews = place?.TotalReviews ?? 0,
					PlaceLatitude = place?.Latitude,
					PlaceLongitude = place?.Longitude,
					AiScore = placeOption.AiScore,
					AiReasoning = placeOption.AiReasoning,
					Pros = string.IsNullOrEmpty(placeOption.Pros) ? new List<string>() : JsonSerializer.Deserialize<List<string>>(placeOption.Pros),
					Cons = string.IsNullOrEmpty(placeOption.Cons) ? new List<string>() : JsonSerializer.Deserialize<List<string>>(placeOption.Cons),
					EstimatedCostPerPerson = placeOption.EstimatedCostPerPerson,
					TotalVotes = 0,
					VoteScore = 0,
					VerificationStatus = place?.VerificationStatus.ToString()
				};

				return Ok(response);
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		/// <summary>
		/// Convert external place option (TrackAsia) to internal Place and update the option
		/// POST: api/Event/{eventId}/option/{optionId}/convert-to-internal
		/// </summary>
		[HttpPost("{eventId}/option/{optionId}/convert-to-internal")]
		public async Task<ActionResult<VenueOptionResponse>> ConvertExternalToInternalPlace(Guid eventId, Guid optionId)
		{
			try
			{
				var userId = GetCurrentUserId();
				var updatedOption = await _eventService.ConvertExternalPlaceToInternalAsync(eventId, optionId, userId);
				
				// Reload with Place details
				var eventEntity = await _eventService.GetEventByIdAsync(eventId);
				var option = eventEntity.EventPlaceOptions.FirstOrDefault(epo => epo.OptionId == optionId);
				
				if (option == null)
					return NotFound(new { message = "Place option not found" });

				var response = new VenueOptionResponse
				{
					OptionId = option.OptionId,
					PlaceId = option.PlaceId,
					PlaceName = option.Place?.Name,
					PlaceAddress = option.Place?.AddressLine1,
					PlaceCategory = option.Place?.PlaceCategory?.Name,
					AverageRating = option.Place?.AverageRating,
					TotalReviews = option.Place?.TotalReviews ?? 0,
					PlaceLatitude = option.Place?.Latitude,
					PlaceLongitude = option.Place?.Longitude,
					
					// External fields cleared after conversion
					ExternalProvider = option.ExternalProvider,
					ExternalPlaceId = option.ExternalPlaceId,
					
					AiScore = option.AiScore,
					AiReasoning = option.AiReasoning,
					Pros = string.IsNullOrEmpty(option.Pros) ? new List<string>() : JsonSerializer.Deserialize<List<string>>(option.Pros),
					Cons = string.IsNullOrEmpty(option.Cons) ? new List<string>() : JsonSerializer.Deserialize<List<string>>(option.Cons),
					EstimatedCostPerPerson = option.EstimatedCostPerPerson,
					TotalVotes = 0,
					VoteScore = 0,
					VerificationStatus = option.Place?.VerificationStatus.ToString()
				};

				return Ok(response);
			}
			catch (Exception ex)
			{
				return BadRequest(new { message = ex.Message });
			}
		}

		// GET: api/Event/search-trackasia-places
		[HttpGet("search-trackasia-places")]
		public async Task<ActionResult> SearchTrackAsiaPlaces([FromQuery] double latitude, [FromQuery] double longitude, [FromQuery] int radius = 2000, [FromQuery] string type = null)
		{
			try
			{
				// Debug logging - Log received parameters
				Console.WriteLine($"[EventController] SearchTrackAsiaPlaces called with:");
				Console.WriteLine($"  - Latitude: {latitude}");
				Console.WriteLine($"  - Longitude: {longitude}");
				Console.WriteLine($"  - Radius: {radius} meters ({radius / 1000.0} km)");
				Console.WriteLine($"  - Type: {type ?? "null"}");
				
				var places = await _trackAsiaService.SearchNearbyPlacesAsync(latitude, longitude, radius, type);
				
				// Debug logging
				Console.WriteLine($"[EventController] Received {places?.Count ?? 0} places from TrackAsia service");
				if (places != null && places.Count > 0)
				{
					Console.WriteLine($"[EventController] First place: {System.Text.Json.JsonSerializer.Serialize(places[0])}");
					Console.WriteLine($"[EventController] Last place: {System.Text.Json.JsonSerializer.Serialize(places[places.Count - 1])}");
				}
				
				// Ensure we return empty array instead of null
				if (places == null)
				{
					Console.WriteLine("[EventController] WARNING: places is null, returning empty array");
					return Ok(new List<object>());
				}
				
				return Ok(places);
			}
			catch (Exception ex)
			{
				Console.WriteLine($"[EventController] ERROR: {ex.Message}");
				Console.WriteLine($"[EventController] Stack trace: {ex.StackTrace}");
				return BadRequest(new { message = ex.Message });
			}
		}

		// Helper method to map Event to EventResponse
		private EventResponse MapToEventResponse(Event eventEntity)
		{
			return new EventResponse
			{
				EventId = eventEntity.EventId,
				OrganizerId = eventEntity.OrganizerId,
				OrganizerName = eventEntity.Organizer?.FullName,
				Title = eventEntity.Title,
				Description = eventEntity.Description,
				EventType = eventEntity.EventType,
				ScheduledDate = eventEntity.ScheduledDate,
				ScheduledTime = eventEntity.ScheduledTime,
				Timezone = eventEntity.Timezone ?? "UTC+00:00", // Include timezone for frontend conversion
				EstimatedDuration = eventEntity.EstimatedDuration,
				ExpectedAttendees = eventEntity.ExpectedAttendees,
				AcceptanceThreshold = eventEntity.AcceptanceThreshold ?? 0.7m, // Default 70%
				BudgetTotal = eventEntity.BudgetTotal,
				BudgetPerPerson = eventEntity.BudgetPerPerson,
				Status = eventEntity.Status,
				VotingDeadline = eventEntity.VotingDeadline,
				FinalPlaceId = eventEntity.FinalPlaceId,
				FinalPlaceName = eventEntity.FinalPlace?.Name,
				CreatedAt = eventEntity.CreatedAt,
				ConfirmedAt = eventEntity.ConfirmedAt,
				CompletedAt = eventEntity.CompletedAt,
				AiAnalysisStartedAt = eventEntity.AiAnalysisStartedAt,
				AiAnalysisProgress = eventEntity.AiAnalysisProgress,
				EventImageUrl = eventEntity.EventImageUrl ?? string.Empty,
				Privacy = eventEntity.Privacy ?? "Public",
				AcceptedCount = eventEntity.EventParticipants?.Count(ep => ep.InvitationStatus == "accepted") ?? 0,
				InvitedCount = eventEntity.EventParticipants?.Count ?? 0,
				Participants = eventEntity.EventParticipants?.Select(ep => new ParticipantResponse
				{
					UserId = ep.UserId,
					FullName = ep.User?.FullName,
					Email = ep.User?.Email,
					InvitationStatus = ep.InvitationStatus,
					RsvpDate = ep.RsvpDate,
					ProfilePictureUrl = ep.User?.UserProfile?.ProfilePictureUrl
				}).ToList() ?? new List<ParticipantResponse>()
			};
		}

		// ============ EVENT SHARING ENDPOINTS ============

		/// <summary>
		/// Share an event with another user
		/// </summary>
		[HttpPost("{eventId}/share")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> ShareEventAsync(
			[FromBody] EventShareCreateDto request,
			[FromRoute] Guid eventId)
		{
			var userId = GetCurrentUserId();

			if (request == null)
			{
				return BadRequest(ApiResponse<string>.ErrorResultWithCode(
					"Request body is null, please input the event share information",
					errorStatusCode: 400));
			}

			if (!ModelState.IsValid)
			{
				return BadRequest(ModelState);
			}

			var response = await _eventShareService.ShareEventAsync(request, eventId, userId);

			if (response.Success)
			{
				return Ok(response);
			}
			else
			{
				return StatusCode(response.StatusCode, response);
			}
		}

		/// <summary>
		/// Revoke event share access
		/// </summary>
		[HttpDelete("share/{shareId}")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> RevokeShareEvent([FromRoute] Guid shareId)
		{
			var userId = GetCurrentUserId();

			if (shareId == Guid.Empty)
				return BadRequest(ApiResponse<string>.ErrorResultWithCode("Share ID is required", 400));

			var response = await _eventShareService.RevokeShareEventAsync(shareId, userId);

			if (response.Success)
			{
				return Ok(response);
			}
			else
			{
				return StatusCode(response.StatusCode, response);
			}
		}

		/// <summary>
		/// Get all events shared with the current user
		/// </summary>
		[HttpGet("events/shared-with-me")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetSharedEventsWithMe()
		{
			var userId = GetCurrentUserId();
			var response = await _eventShareService.GetSharedWithMeAsync(userId);

			if (response.Success)
			{
				return Ok(response);
			}
			else
			{
				return StatusCode(response.StatusCode, response);
			}
		}

		/// <summary>
		/// Get all available shares for a specific event
		/// </summary>
		[HttpGet("{eventId}/shares")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetEventShares([FromRoute] Guid eventId)
		{
			if (eventId == Guid.Empty)
				return BadRequest(ApiResponse<string>.ErrorResultWithCode("Event ID is required", 400));

			var response = await _eventShareService.GetSharesByEventIdAsync(eventId);

			if (response.Success)
			{
				return Ok(response);
			}
			else
			{
				return StatusCode(response.StatusCode, response);
			}
		}

		/// <summary>
		/// Reschedule an event
		/// </summary>
		[HttpPut("{id}/reschedule")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> RescheduleEvent(
			[FromRoute] Guid id,
			[FromBody] RescheduleEventRequest request)
		{
			try
			{
				var userId = GetCurrentUserId();
				var result = await _eventService.RescheduleEventAsync(
					id,
					userId,
					request.NewDate,
					request.NewTime,
					request.Reason ?? "No reason provided");

				if (result)
					return Ok(new { message = "Event rescheduled successfully" });
				else
					return BadRequest(new { message = "Failed to reschedule event" });
			}
			catch (UnauthorizedAccessException ex)
			{
				return Forbid(ex.Message);
			}
			catch (InvalidOperationException ex)
			{
				return BadRequest(new { message = ex.Message });
			}
			catch (NotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Get check-in status for current user
		/// </summary>
		[HttpGet("{id}/checkin")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetCheckInStatus([FromRoute] Guid id)
		{
			try
			{
				var userId = GetCurrentUserId();
				var checkIn = await _eventService.GetCheckInByEventAndUserAsync(id, userId);

				if (checkIn == null)
					return NotFound(new { message = "Check-in not found" });

				return Ok(checkIn);
			}
			catch (UnauthorizedAccessException ex)
			{
				return Forbid(ex.Message);
			}
			catch (NotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Check in to an event
		/// </summary>
		[HttpPost("{id}/checkin")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> CheckInEvent(
			[FromRoute] Guid id,
			[FromBody] CheckInEventRequest request)
		{
			try
			{
				var userId = GetCurrentUserId();
				var result = await _eventService.CheckInEventAsync(
					id,
					userId,
					request.Latitude,
					request.Longitude,
					request.CheckInMethod ?? "manual");

				if (result)
					return Ok(new { message = "Checked in successfully" });
				else
					return BadRequest(new { message = "Failed to check in" });
			}
			catch (UnauthorizedAccessException ex)
			{
				return Forbid(ex.Message);
			}
			catch (InvalidOperationException ex)
			{
				return BadRequest(new { message = ex.Message });
			}
			catch (NotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Get feedback for a completed event by current user
		/// </summary>
		[HttpGet("{id}/feedback")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetEventFeedback([FromRoute] Guid id)
		{
			try
			{
				var userId = GetCurrentUserId();
				var feedback = await _eventService.GetFeedbackByEventAndUserAsync(id, userId);

				if (feedback == null)
					return NotFound(new { message = "Feedback not found" });

				return Ok(feedback);
			}
			catch (UnauthorizedAccessException ex)
			{
				return Forbid(ex.Message);
			}
			catch (NotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Submit feedback for a completed event
		/// </summary>
		[HttpPost("{id}/feedback")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> SubmitEventFeedback(
			[FromRoute] Guid id,
			[FromBody] SubmitFeedbackRequest request)
		{
			try
			{
				var userId = GetCurrentUserId();
				var feedback = await _eventService.SubmitEventFeedbackAsync(
					id,
					userId,
					request.VenueRating,
					request.FoodRating,
					request.OverallRating,
					request.Comments,
					request.Suggestions,
					request.WouldAttendAgain);

				return Ok(new { message = "Feedback submitted successfully", feedback });
			}
			catch (UnauthorizedAccessException ex)
			{
				return Forbid(ex.Message);
			}
			catch (InvalidOperationException ex)
			{
				return BadRequest(new { message = ex.Message });
			}
			catch (NotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Update feedback for a completed event
		/// </summary>
		[HttpPut("{id}/feedback")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> UpdateEventFeedback(
			[FromRoute] Guid id,
			[FromBody] SubmitFeedbackRequest request)
		{
			try
			{
				var userId = GetCurrentUserId();
				var feedback = await _eventService.UpdateEventFeedbackAsync(
					id,
					userId,
					request.VenueRating,
					request.FoodRating,
					request.OverallRating,
					request.Comments,
					request.Suggestions,
					request.WouldAttendAgain);

				return Ok(new { message = "Feedback updated successfully", feedback });
			}
			catch (UnauthorizedAccessException ex)
			{
				return Forbid(ex.Message);
			}
			catch (InvalidOperationException ex)
			{
				return BadRequest(new { message = ex.Message });
			}
			catch (NotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		// Phase 2 API Endpoints

		/// <summary>
		/// Get event analytics
		/// </summary>
		[HttpGet("{id}/analytics")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetEventAnalytics([FromRoute] Guid id)
		{
			try
			{
				var userId = GetCurrentUserId();
				var analytics = await _analyticsService.GetEventAnalyticsAsync(id, userId);
				return Ok(analytics);
			}
			catch (UnauthorizedAccessException ex)
			{
				return Forbid(ex.Message);
			}
			catch (NotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Get organizer analytics
		/// </summary>
		[HttpGet("organizer/analytics")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetOrganizerAnalytics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
		{
			try
			{
				var userId = GetCurrentUserId();
				var analytics = await _analyticsService.GetOrganizerAnalyticsAsync(userId, startDate, endDate);
				return Ok(analytics);
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Get event trends
		/// </summary>
		[HttpGet("organizer/trends")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetEventTrends([FromQuery] int months = 6)
		{
			try
			{
				var userId = GetCurrentUserId();
				var trends = await _analyticsService.GetEventTrendsAsync(userId, months);
				return Ok(trends);
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Get participation stats
		/// </summary>
		[HttpGet("{id}/participation-stats")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetParticipationStats([FromRoute] Guid id)
		{
			try
			{
				var userId = GetCurrentUserId();
				var stats = await _analyticsService.GetParticipationStatsAsync(id, userId);
				return Ok(stats);
			}
			catch (UnauthorizedAccessException ex)
			{
				return Forbid(ex.Message);
			}
			catch (NotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Create event template
		/// </summary>
		[HttpPost("templates")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> CreateEventTemplate([FromBody] CreateEventTemplateRequest request)
		{
			try
			{
				var userId = GetCurrentUserId();
				var template = new Domain.Entities.EventTemplate
				{
					TemplateName = request.TemplateName,
					Title = request.Title,
					EventDescription = request.EventDescription,
					EventType = request.EventType,
					EstimatedDuration = request.EstimatedDuration,
					ExpectedAttendees = request.ExpectedAttendees,
					MaxAttendees = request.MaxAttendees,
					BudgetTotal = request.BudgetTotal,
					BudgetPerPerson = request.BudgetPerPerson,
					Timezone = request.Timezone ?? "UTC",
					IsPublic = request.IsPublic,
					IsDefault = request.IsDefault
				};

				var createdTemplate = await _eventService.CreateEventTemplateAsync(userId, template);
				return Ok(createdTemplate);
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Get event templates
		/// </summary>
		[HttpGet("templates")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetEventTemplates([FromQuery] bool publicOnly = false)
		{
			try
			{
				var userId = GetCurrentUserId();
				List<Domain.Entities.EventTemplate> templates;

				if (publicOnly)
					templates = await _templateRepository.GetPublicTemplatesAsync();
				else
				{
					var userTemplates = await _templateRepository.GetByUserIdAsync(userId);
					var publicTemplates = await _templateRepository.GetPublicTemplatesAsync();
					templates = userTemplates.Concat(publicTemplates).Distinct().ToList();
				}

				return Ok(templates);
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Create event from template
		/// </summary>
		[HttpPost("templates/{templateId}/create-event")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> CreateEventFromTemplate(
			[FromRoute] Guid templateId,
			[FromBody] CreateEventFromTemplateRequest request)
		{
			try
			{
				var userId = GetCurrentUserId();
				var eventEntity = await _eventService.CreateEventFromTemplateAsync(
					templateId,
					userId,
					request.ScheduledDate,
					request.ScheduledTime);

				return Ok(eventEntity);
			}
			catch (UnauthorizedAccessException ex)
			{
				return Forbid(ex.Message);
			}
			catch (NotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Create recurring event
		/// </summary>
		[HttpPost("recurring")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> CreateRecurringEvent([FromBody] CreateRecurringEventRequest request)
		{
			try
			{
				var userId = GetCurrentUserId();
				var recurringEvent = new Domain.Entities.RecurringEvent
				{
					Title = request.Title,
					Description = request.Description,
					EventType = request.EventType,
					RecurrencePattern = request.RecurrencePattern,
					DaysOfWeek = request.DaysOfWeek,
					DayOfMonth = request.DayOfMonth,
					Month = request.Month,
					DayOfYear = request.DayOfYear,
					ScheduledTime = request.ScheduledTime,
					EstimatedDuration = request.EstimatedDuration,
					ExpectedAttendees = request.ExpectedAttendees,
					BudgetPerPerson = request.BudgetPerPerson,
					StartDate = request.StartDate,
					EndDate = request.EndDate,
					OccurrenceCount = request.OccurrenceCount,
					AutoCreateEvents = request.AutoCreateEvents,
					DaysInAdvance = request.DaysInAdvance
				};

				var created = await _eventService.CreateRecurringEventAsync(userId, recurringEvent);
				return Ok(created);
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Get recurring events
		/// </summary>
		[HttpGet("recurring")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetRecurringEvents()
		{
			try
			{
				var userId = GetCurrentUserId();
				var recurringEvents = await _recurringEventRepository.GetByOrganizerIdAsync(userId);
				return Ok(recurringEvents);
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Get recurring event by ID
		/// </summary>
		[HttpGet("recurring/{id}")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetRecurringEventById([FromRoute] Guid id)
		{
			try
			{
				var userId = GetCurrentUserId();
				var recurringEvent = await _recurringEventRepository.GetByIdAsync(id);
				
				if (recurringEvent == null)
				{
					return NotFound(new { message = "Recurring event not found" });
				}

				// Check if user is the organizer
				if (recurringEvent.OrganizerId != userId)
				{
					return Forbid("You can only view your own recurring events");
				}

				return Ok(recurringEvent);
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Update recurring event
		/// </summary>
		[HttpPut("recurring/{id}")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> UpdateRecurringEvent(
			[FromRoute] Guid id,
			[FromBody] CreateRecurringEventRequest request)
		{
			try
			{
				var userId = GetCurrentUserId();
				var existingEvent = await _recurringEventRepository.GetByIdAsync(id);

				if (existingEvent == null)
				{
					return NotFound(new { message = "Recurring event not found" });
				}

				// Check if user is the organizer
				if (existingEvent.OrganizerId != userId)
				{
					return Forbid("You can only update your own recurring events");
				}

				// Update properties
				existingEvent.Title = request.Title;
				existingEvent.Description = request.Description;
				existingEvent.EventType = request.EventType;
				existingEvent.RecurrencePattern = request.RecurrencePattern;
				existingEvent.DaysOfWeek = request.DaysOfWeek;
				existingEvent.DayOfMonth = request.DayOfMonth;
				existingEvent.Month = request.Month;
				existingEvent.DayOfYear = request.DayOfYear;
				existingEvent.ScheduledTime = request.ScheduledTime;
				existingEvent.EstimatedDuration = request.EstimatedDuration;
				existingEvent.ExpectedAttendees = request.ExpectedAttendees;
				existingEvent.BudgetPerPerson = request.BudgetPerPerson;
				existingEvent.StartDate = request.StartDate;
				existingEvent.EndDate = request.EndDate;
				existingEvent.OccurrenceCount = request.OccurrenceCount;
				existingEvent.AutoCreateEvents = request.AutoCreateEvents;
				existingEvent.DaysInAdvance = request.DaysInAdvance;
				existingEvent.UpdatedAt = DateTimeOffset.UtcNow;

				await _recurringEventRepository.UpdateAsync(existingEvent);
				return Ok(existingEvent);
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Delete recurring event
		/// </summary>
		[HttpDelete("recurring/{id}")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> DeleteRecurringEvent([FromRoute] Guid id)
		{
			try
			{
				var userId = GetCurrentUserId();
				var recurringEvent = await _recurringEventRepository.GetByIdAsync(id);

				if (recurringEvent == null)
				{
					return NotFound(new { message = "Recurring event not found" });
				}

				// Check if user is the organizer
				if (recurringEvent.OrganizerId != userId)
				{
					return Forbid("You can only delete your own recurring events");
				}

				await _recurringEventRepository.DeleteAsync(id);
				return Ok(new { message = "Recurring event deleted successfully" });
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Toggle recurring event status (active/paused)
		/// </summary>
		[HttpPatch("recurring/{id}/status")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> ToggleRecurringEventStatus(
			[FromRoute] Guid id,
			[FromBody] ToggleRecurringEventStatusRequest request)
		{
			try
			{
				var userId = GetCurrentUserId();
				var recurringEvent = await _recurringEventRepository.GetByIdAsync(id);

				if (recurringEvent == null)
				{
					return NotFound(new { message = "Recurring event not found" });
				}

				// Check if user is the organizer
				if (recurringEvent.OrganizerId != userId)
				{
					return Forbid("You can only update your own recurring events");
				}

				// Validate status
				if (request.Status != "active" && request.Status != "paused")
				{
					return BadRequest(new { message = "Status must be 'active' or 'paused'" });
				}

				recurringEvent.Status = request.Status;
				recurringEvent.UpdatedAt = DateTimeOffset.UtcNow;

				await _recurringEventRepository.UpdateAsync(recurringEvent);
				return Ok(recurringEvent);
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Join event waitlist
		/// </summary>
		[HttpPost("{id}/waitlist")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> JoinWaitlist(
			[FromRoute] Guid id,
			[FromBody] JoinWaitlistRequest request)
		{
			try
			{
				var userId = GetCurrentUserId();
				var result = await _eventService.JoinEventWaitlistAsync(id, userId, request.Priority, request.Notes);

				if (result)
					return Ok(new { message = "Added to waitlist successfully" });
				else
					return BadRequest(new { message = "Failed to join waitlist" });
			}
			catch (InvalidOperationException ex)
			{
				return BadRequest(new { message = ex.Message });
			}
			catch (NotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Get current user's waitlist status for an event
		/// </summary>
		[HttpGet("{id}/waitlist/status")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetWaitlistStatus([FromRoute] Guid id)
		{
			try
			{
				var userId = GetCurrentUserId();
				var waitlist = await _eventService.GetWaitlistByEventAndUserAsync(id, userId);

				if (waitlist == null)
					return NotFound(new { message = "Not on waitlist" });

				return Ok(waitlist);
			}
			catch (NotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Get event waitlist (organizer only)
		/// </summary>
		[HttpGet("{id}/waitlist")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> GetEventWaitlist([FromRoute] Guid id)
		{
			try
			{
				var userId = GetCurrentUserId();
				var eventEntity = await _eventService.GetEventByIdAsync(id);

				if (eventEntity.OrganizerId != userId)
					return Forbid("Only organizer can view waitlist");

				var waitlist = await _waitlistRepository.GetByEventIdAsync(id);
				return Ok(waitlist);
			}
			catch (NotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Promote user from waitlist
		/// </summary>
		[HttpPost("{id}/waitlist/{userId}/promote")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> PromoteFromWaitlist([FromRoute] Guid id, [FromRoute] Guid userId)
		{
			try
			{
				var organizerId = GetCurrentUserId();
				var result = await _eventService.PromoteFromWaitlistAsync(id, userId, organizerId);

				if (result)
					return Ok(new { message = "User promoted from waitlist successfully" });
				else
					return BadRequest(new { message = "Failed to promote from waitlist" });
			}
			catch (UnauthorizedAccessException ex)
			{
				return Forbid(ex.Message);
			}
			catch (InvalidOperationException ex)
			{
				return BadRequest(new { message = ex.Message });
			}
			catch (NotFoundException ex)
			{
				return NotFound(new { message = ex.Message });
			}
			catch (Exception ex)
			{
				return StatusCode(500, new { message = "An error occurred", error = ex.Message });
			}
		}

		/// <summary>
		/// Upload event avatar/cover image
		/// </summary>
		[HttpPatch("{eventId}/upload-image")]
		[Authorize(Roles = "User")]
		public async Task<IActionResult> UploadEventImage([FromRoute] Guid eventId, IFormFile imageFile)
		{
			var userId = GetCurrentUserId();

			if (imageFile == null || imageFile.Length == 0)
			{
				return BadRequest(ApiResponse<string>.ErrorResultWithCode("No file uploaded", errorStatusCode: 400));
			}

			// Check if user is the organizer
			var eventEntity = await _eventService.GetEventByIdAsync(eventId);
			if (eventEntity.OrganizerId != userId)
			{
				return StatusCode(403, ApiResponse<string>.ErrorResultWithCode(
					"Access denied. You must be the event organizer to upload image.", errorStatusCode: 403));
			}

			var result = await _eventService.AddEventImageAsync(eventId, imageFile, userId);
			
			if (result.IsSuccess)
			{
				return Ok(ApiResponse<UploadResultDto>.SuccessResult(result, "Event image uploaded successfully"));
			}
			else
			{
				return StatusCode(500, ApiResponse<UploadResultDto>.ErrorResultWithCode(
					result.ErrorMessage ?? "Failed to upload image", errorStatusCode: 500));
			}
		}

		/// <summary>
		/// Generate a cover image for event using AI (User role)
		/// </summary>
		/// <param name="request">Event data to generate image from</param>
		/// <returns>URL of the generated and uploaded image</returns>
		[HttpPost("generate-cover-image")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> GenerateEventCoverImage([FromBody] EventImageGenerationRequest request)
		{
			var userId = GetCurrentUserId();

			if (request == null)
			{
				return BadRequest(ApiResponse<string>.ErrorResultWithCode("Request body is required", errorStatusCode: 400));
			}

			try
			{
				// Step 1: Generate image prompt using Groq
				var prompt = await _aiServiceForImage.GenerateImagePromptAsync(
					request.Title,
					request.Description ?? "",
					request.EventType ?? "Social",
					request.Location ?? "",
					request.Country ?? ""
				);

				// Step 2: Generate image using image generation service
				var imageBytes = await _imageGenerationService.GenerateImageAsync(prompt);

				// Step 3: Upload to Cloudinary
				var fileName = $"event-{Guid.NewGuid()}.jpg";
				var uploadResult = await _cloudinaryHelper.UploadImageFromBytesAsync(imageBytes, "events", fileName);

				if (!uploadResult.IsSuccess)
				{
					return StatusCode(500, ApiResponse<string>.ErrorResultWithCode(
						uploadResult.ErrorMessage ?? "Failed to upload generated image", errorStatusCode: 500));
				}

				return Ok(ApiResponse<string>.SuccessResult(uploadResult.FileUrl));
			}
			catch (Exception ex)
			{
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode(
					$"Error generating image: {ex.Message}", errorStatusCode: 500));
			}
		}
	}

	// Request DTOs
	public class RescheduleEventRequest
	{
		public DateTime NewDate { get; set; }
		public TimeSpan NewTime { get; set; }
		public string? Reason { get; set; }
	}

	public class CheckInEventRequest
	{
		public double? Latitude { get; set; }
		public double? Longitude { get; set; }
		public string? CheckInMethod { get; set; }
	}

	public class SubmitFeedbackRequest
	{
		[Range(1, 5)]
		public int VenueRating { get; set; }
		[Range(1, 5)]
		public int FoodRating { get; set; }
		[Range(1, 5)]
		public int OverallRating { get; set; }
		public string? Comments { get; set; }
		public string? Suggestions { get; set; }
		public bool WouldAttendAgain { get; set; }
	}

	// Phase 2 Request DTOs
	public class CreateEventTemplateRequest
	{
		public string TemplateName { get; set; }
		public string Title { get; set; }
		public string? EventDescription { get; set; }
		public string EventType { get; set; }
		public int? EstimatedDuration { get; set; }
		public int ExpectedAttendees { get; set; }
		public int? MaxAttendees { get; set; }
		public decimal? BudgetTotal { get; set; }
		public decimal? BudgetPerPerson { get; set; }
		public string? Timezone { get; set; }
		public bool IsPublic { get; set; }
		public bool IsDefault { get; set; }
	}

	public class CreateEventFromTemplateRequest
	{
		public DateTime ScheduledDate { get; set; }
		public TimeSpan ScheduledTime { get; set; }
	}

	public class CreateRecurringEventRequest
	{
		public string Title { get; set; }
		public string? Description { get; set; }
		public string EventType { get; set; }
		public string RecurrencePattern { get; set; }
		public string? DaysOfWeek { get; set; }
		public int? DayOfMonth { get; set; }
		public int? Month { get; set; }
		public int? DayOfYear { get; set; }
		public TimeSpan ScheduledTime { get; set; }
		public int? EstimatedDuration { get; set; }
		public int ExpectedAttendees { get; set; }
		public decimal? BudgetPerPerson { get; set; }
		public DateTime StartDate { get; set; }
		public DateTime? EndDate { get; set; }
		public int? OccurrenceCount { get; set; }
		public bool AutoCreateEvents { get; set; } = true;
		public int DaysInAdvance { get; set; } = 7;
	}

	public class ToggleRecurringEventStatusRequest
	{
		public string Status { get; set; } // "active" or "paused"
	}

	public class JoinWaitlistRequest
	{
		public int? Priority { get; set; }
		public string? Notes { get; set; }
	}

	/// <summary>
	/// Request model for generating event cover image
	/// </summary>
	public class EventImageGenerationRequest
	{
		public string Title { get; set; } = string.Empty;
		public string? Description { get; set; }
		public string? EventType { get; set; }
		public string? Location { get; set; }
		public string? Country { get; set; }
	}
}
