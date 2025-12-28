using Application.Interfaces;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using Domain.Entities;
using Domain.Enums;
using Domain.Enums.NotificationActionType;
using Infrastructure.Configurations;
using Infrastructure.Helper;
using Infrastructure.Interfaces;
using Infrastructure.Interfaces.AdminManage;
using Infrastructure.Interfaces.IPlaceRepos;
using Infrastructure.Models.AdminManageModel;
using Infrastructure.Models.Common;
using Infrastructure.Models.Moderator;
using Infrastructure.Models.NotificationDTO;
using Infrastructure.Models.PlaceDTO;
using Infrastructure.Models.PlaceReview;
using Infrastructure.Models.RouteCalculationDTO;
using Infrastructure.Models.UserDTO;
using Infrastructure.Repositories.PlaceRepos;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NetTopologySuite.Mathematics;
using QuestPDF.Infrastructure;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using static QuestPDF.Helpers.Colors;
using static System.Net.Mime.MediaTypeNames;

namespace Application.Services
{
    public class PlaceService : IPlaceService
    {
        private readonly IPlaceRepository _placeRepository;
        private readonly IUserPreferenceRepository _userPrefRepository;
        private readonly IUserProfileRepository _userProfileRepository;
        private readonly IPlaceImageRepository _placeImageRepository;
        private readonly INotificationService _notificationService;
        private readonly IUserRepository _userRepository;
        private readonly ISavedPlaceRepository _savedPlaceRepository;
        private readonly IPlaceTagAssignmentRepository _placeTagAssignmentRepository;
        private readonly IPlaceTagRepository _placeTagRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public PlaceService(IPlaceRepository placeRepository, IUserPreferenceRepository userPreferenceRepository,
            IUserProfileRepository userProfileRepository, INotificationService notificationService,
            IPlaceImageRepository placeImageRepository, IUserRepository userRepository,
            ISavedPlaceRepository savedPlaceRepository, IPlaceTagAssignmentRepository placeTagAssignmentRepository,
            IPlaceTagRepository placeTagRepository, IUnitOfWork unitOfWork, IMapper mapper)
        {
            _placeRepository = placeRepository;
            _userPrefRepository = userPreferenceRepository;
            _userProfileRepository = userProfileRepository;
            _notificationService = notificationService;
            _placeImageRepository = placeImageRepository;
            _userRepository = userRepository;
            _savedPlaceRepository = savedPlaceRepository;
            _placeTagAssignmentRepository = placeTagAssignmentRepository;
            _placeTagRepository = placeTagRepository;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<PlaceDetailForHome> CreatePlaceAsync(CreatePlaceDto createPlaceDto, Guid userId)
        {
            var transaction = await _unitOfWork.BeginTransactionAsync();
            try
            {
                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null || user.CurrentBranchId == null)
                    throw new KeyNotFoundException($"You need to update your current branch to add new place.");

                var place = _mapper.Map<Place>(createPlaceDto);

                place.CreatedAt = DateTimeOffset.Now;
                place.UpdatedAt = DateTimeOffset.Now;
                place.CreatedBy = userId;
                place.BranchId = user.CurrentBranchId;

                // Save place
                place = await _placeRepository.CreatePlaceAsync(place);

                // Map and add images
                var images = _mapper.Map<List<PlaceImage>>(createPlaceDto.ImageUrlsList);
                images.ForEach(img =>
                {
                    img.PlaceId = place.PlaceId;
                    img.UploadedBy = userId;
                });
                await _placeImageRepository.AddInBatchAsync(images);

                place.PlaceImages = images;
                var result = _mapper.Map<PlaceDetailForHome>(place);

                // Add tags
                foreach (var tagId in createPlaceDto.Tags)
                {
                    await _placeTagAssignmentRepository.AssignTagIntoPlace(place.PlaceId, tagId, userId);
                }

                if (transaction != null)
                    await _unitOfWork.CommitAsync();

               

                return result;
            }
            catch
            {
                await _unitOfWork.RollbackAsync();
                throw;
            }
        }

        public async Task<int> DeletePlaceAsync(Guid placeId, Guid userId)
        {
            var place = await _placeRepository.GetByIdAsync(placeId, Guid.Empty);
            var actor = await _userRepository.GetByIdAsync(place.CreatedBy.Value);
            if (actor == null)
                throw new KeyNotFoundException($"Cannot found place creator with id: {place.CreatedBy.Value} to notify.");

            int result = await _placeRepository.DeleteAsync(placeId);

            return result;
        }

        public async Task<PlaceDetail> GetPlaceByIdAsync(Guid placeId, Guid userId)
        {
            var place = await _placeRepository.GetByIdAsync(placeId, userId);

            var result = _mapper.Map<PlaceDetail>(place, opts =>
            {
                opts.Items["UserId"] = userId;
            });

            return result;
        }

        public async Task<IEnumerable<PlaceList>> GetByBoundingBoxAsync(PlaceBoundingBoxSearchFilter filter)
        {
            var result = await _placeRepository.GetByBoundingBoxAsync(filter);
            return _mapper.Map<IEnumerable<PlaceList>>(result);
        }

        public async Task<List<PlaceImageDto>> GetImagesByPlaceIdAsync(Guid placeId)
        {
            //Find image through navigation property
            var result = await _placeRepository.GetImagesByPlaceIdAsync(placeId);
            var mappedData = result.Select(i => _mapper.Map<PlaceImageDto>(i)).ToList();
            return mappedData;
        }


        public async Task<int> AddImagesToPlace(AddPlaceImage addPlaceImage, Guid userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            var place = await _placeRepository.GetByIdAsync(addPlaceImage.PlaceId, userId);

            if (place == null)
                throw new KeyNotFoundException($"Cannot found place with id: {addPlaceImage.PlaceId} to add image.");

            if (userId == place.CreatedBy || user.Role.RoleName == "Modertor")
            {
                foreach (var img in addPlaceImage.ImageUrlsList)
                {
                    var addImage = _mapper.Map<PlaceImage>(img);
                    addImage.PlaceId = addPlaceImage.PlaceId;
                    addImage.UploadedBy = userId;
                    await _placeImageRepository.AddPlaceImage(addImage);
                }

                return await _placeImageRepository.SaveChangesAsync();
            }
            throw new UnauthorizedAccessException("You do not have permission to add images to this place.");
        }

        public async Task<int> RemoveImage(Guid userId, Guid imageId)
        {
            var image = await _placeImageRepository.GetByIdAsync(imageId);
            var user = await _userRepository.GetByIdAsync(userId);
            if (user.Role.RoleName == "Moderator" || userId == image.UploadedBy)
            {
                await _placeImageRepository.RemoveImageAsync(imageId);
                return await _placeImageRepository.SaveChangesAsync();
            }
            else
                throw new UnauthorizedAccessException("You do not have permission to delete this image.");
        }

        public async Task UpdatePlaceAsync(UpdatePlaceDTO updatePlaceDTO, Guid userId)
        {
            var transaction = await _unitOfWork.BeginTransactionAsync();
            try
            {
                bool isModerator = false;
                var existingPlace = await _placeRepository.GetByIdAsync(updatePlaceDTO.PlaceId, userId);
                var user = await _userRepository.GetByIdAsync(userId);

                if (existingPlace == null)
                    throw new KeyNotFoundException($"Cannot found place with id: {updatePlaceDTO.PlaceId} to update.");

                // Check if user has permission to update the place
                if (user.Role.RoleName != "Moderator" && userId != existingPlace.CreatedBy)
                    throw new UnauthorizedAccessException("You do not have permission to update this place");

                if (user.Role.RoleName == "Moderator")
                    isModerator = true;

                _mapper.Map(updatePlaceDTO, existingPlace);
                await _placeRepository.UpdateAsync(existingPlace);

                // Handle Place Images
                var existingImages = await _placeImageRepository.GetAllImageOfPlaceAsync(updatePlaceDTO.PlaceId);

                var existingImageUrls = existingImages.Select(img => img.ImageUrl).ToList();
                var updatedImageUrls = updatePlaceDTO.ImageUrlsList?.Select(img => img.ImageUrl) ?? Enumerable.Empty<string>();

                var newImageUrls = updatedImageUrls.Except(existingImageUrls).ToList();
                var removedImageUrls = existingImageUrls.Except(updatedImageUrls).ToList();

                // Remove images that are in the removed list
                var imagesToRemove = existingImages.Where(img => removedImageUrls.Contains(img.ImageUrl)).ToList();
                await _placeImageRepository.RemoveInBatchAsync(imagesToRemove);

                // Add new images that are in the new list
                var newPlaceImages = updatePlaceDTO.ImageUrlsList.Where(img => newImageUrls.Contains(img.ImageUrl)).Select(img => new PlaceImage
                {
                    PlaceId = updatePlaceDTO.PlaceId,
                    UploadedBy = userId,
                    ImageUrl = img.ImageUrl,
                    AltText = img.AltText,
                    UploadDate = DateTimeOffset.UtcNow
                }).ToList();

                if (newPlaceImages.Any())
                    await _placeImageRepository.AddInBatchAsync(newPlaceImages);

                // Update Tags
                var existingTagAssignments = await _placeTagAssignmentRepository.GetTagsOfPlace(updatePlaceDTO.PlaceId);
                var existingTagIds = existingTagAssignments.Select(t => t.TagId).ToList();
                var updatedTagIds = updatePlaceDTO.Tags;
                var newTagIds = updatedTagIds.Except(existingTagIds).ToList();
                var removedTagIds = existingTagIds.Except(updatedTagIds).ToList();
                // Remove tags that are in the removed list
                foreach (var tagId in removedTagIds)
                    await _placeTagAssignmentRepository.RemoveTagFromPlace(updatePlaceDTO.PlaceId, tagId);
                // Add new tags that are in the new list
                foreach (var tagId in newTagIds)
                    await _placeTagAssignmentRepository.AssignTagIntoPlace(updatePlaceDTO.PlaceId, tagId, userId);

                if (transaction != null)
                    await _unitOfWork.CommitAsync();
            }
            catch
            {
                await _unitOfWork.RollbackAsync();
                throw;
            }
        }


        public async Task<PagedResult<PlaceListItemDto>> GetAllAsync(OnlyPageRequest req)
        {
            var places = _placeRepository.GetAllPlace();

            var pagedResult = await PageConverter<PlaceListItemDto>.ToPagedResultAsync(
                req.Page, req.PageSize, places.Count(), places.ProjectTo<PlaceListItemDto>(_mapper.ConfigurationProvider));

            return pagedResult;
        }

        public async Task<PagedResult<PlaceListItemDto>> SearchPlacesByNameOrAddressAsync(string? name, double userLat, double userLng, int page, int pageSize)
        {
            var places = _placeRepository.SearchPlacesNearBy(name, userLat, userLng);

            var pagedResult = await PageConverter<PlaceListItemDto>.ToPagedResultAsync(
                page, pageSize, places.Count(), places.ProjectTo<PlaceListItemDto>(_mapper.ConfigurationProvider));

            return pagedResult;
        }

        public async Task<PagedResult<PlaceListItemDto>> GetAllCreatedPlaceAsync(Guid userId, OnlyPageRequest req)
        {
            var places = _placeRepository.GetAllCreatedPlace(userId);

            var pagedResult = await PageConverter<PlaceListItemDto>.ToPagedResultAsync(
                req.Page, req.PageSize, places.Count(), places.ProjectTo<PlaceListItemDto>(_mapper.ConfigurationProvider));

            return pagedResult;
        }

        public async Task<PagedResult<PlaceWithReviews>> GetAllCreatedPlaceOfAsync(Guid userId, OnlyPageRequestWithUserId req)
        {
            var query = _placeRepository.GetAllCreatedPlaceOf(userId, req.UserId);

            var totalCount = await query.CountAsync();
            var places = await query
                .OrderBy(f => f.CreatedAt)
                .Skip((req.Page - 1) * req.PageSize)
                .Take(req.PageSize)
                .ToListAsync();

            var placeList = _mapper.Map<List<PlaceWithReviews>>(places, opts =>
            {
                opts.Items["UserId"] = userId;
            });
            return new PagedResult<PlaceWithReviews>(
                req.Page,
                req.PageSize,
                totalCount,
                placeList
                );
        }

        public Task<List<PlaceCategory>> GetAllPlaceCategory()
        {
            var categories = _placeRepository.GetAllPlaceCategory();
            return categories;
        }

        public async Task<PagedResult<PlaceDetailForHome>> GetAllPendingPlaceAsync(Guid moderatorId, OnlyPageRequest req)
        {
            var moderator = await _userRepository.GetByIdAsync(moderatorId);
            if (moderator == null)
                throw new InvalidOperationException("Can not found your account!");

            var query = await _placeRepository.GetAllPendingPlaceAsync(moderator.CurrentBranchId);

            var totalCount = await query.CountAsync();

            var pagedPlaces = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((req.Page - 1) * req.PageSize)
                .Take(req.PageSize)
                .ProjectTo<PlaceDetailForHome>(_mapper.ConfigurationProvider)
                .ToListAsync();

            return new PagedResult<PlaceDetailForHome>(req.Page, req.PageSize, totalCount, pagedPlaces);
        }

        public async Task<int> VerifyPlaceAsync(Guid moderatorId, UpdatePlaceStatus updatePlaceStatus)
        {
            var moderator = await _userRepository.GetByIdAsync(moderatorId);
            if (moderator == null)
                throw new InvalidOperationException("Can not found your account!");

            var place = await _placeRepository.GetByIdAsync(updatePlaceStatus.PlaceId, moderatorId);
            if (place == null)
                throw new KeyNotFoundException($"Cannot found place with id: {updatePlaceStatus.PlaceId} to verify.");

            if (place.CreatedBy == null)
                throw new InvalidOperationException("Place does not have a creator to notify.");

            if (place.BranchId != moderator.CurrentBranchId)
                throw new UnauthorizedAccessException("You do not have permission to verify this place.");

            int result = await _placeRepository.VerifyPlaceAsync(updatePlaceStatus.PlaceId, updatePlaceStatus.Status, updatePlaceStatus.Notes);

            if (updatePlaceStatus.Status == PlaceVerificationStatus.Approved && !string.IsNullOrWhiteSpace(place.AiSuggestedTags))
            {
                try
                {
                    await ConvertAiSuggestedTagsToPlaceTagAssignmentsAsync(place.PlaceId, place.AiSuggestedTags, moderatorId);
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"Failed to convert AI suggested tags to PlaceTagAssignments: {ex.Message}");
                }
            }

            var actor = await _userRepository.GetByIdAsync(place.CreatedBy.Value);
            if (actor == null)
                throw new KeyNotFoundException($"Cannot found place creator with id: {place.CreatedBy.Value} to notify.");

            if(updatePlaceStatus.Status == PlaceVerificationStatus.Approved)
            {
				await NotifyPlaceAction(actor, place, moderator, PlaceActionType.VerifyApproved, BoardcastMode.User);

			} else if (updatePlaceStatus.Status == PlaceVerificationStatus.Rejected)
            {
                await NotifyPlaceAction(actor, place, moderator, PlaceActionType.VerifyRejected, BoardcastMode.User);
			}

			return result;
        }

        public async Task<PagedResult<PlaceWithReviews>> GetAllPlaceByBranchIdAsync(Guid userId, OnlyPageRequest req)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new InvalidOperationException("Can not found your account!");

            var query = _placeRepository.GetAllPlaceByBranchId((Guid)user.CurrentBranchId, userId);

            var totalCount = await query.CountAsync();
            var places = await query
                .OrderBy(f => f.CreatedAt)
                .Skip((req.Page - 1) * req.PageSize)
                .Take(req.PageSize)
                .ToListAsync();

            var placeList = _mapper.Map<List<PlaceWithReviews>>(places, opts =>
            {
                opts.Items["UserId"] = userId;
            });
            return new PagedResult<PlaceWithReviews>(
                req.Page,
                req.PageSize,
                totalCount,
                placeList
                );
        }

        public async Task LikePlaceAsync(Guid userId, Guid placeId)
        {
            var transaction = await _unitOfWork.BeginTransactionAsync();
            try
            {
                await _placeRepository.LikePlaceAsync(userId, placeId);
                await _placeRepository.AddLikeToPlace(placeId);
                await _unitOfWork.SaveChangesAsync();
                if (transaction != null)
                    await _unitOfWork.CommitAsync();
            }
            catch
            {
                await _unitOfWork.RollbackAsync();
                throw;
            }
        }

        public async Task DislikePlaceAsync(Guid userId, Guid placeId)
        {
            var transaction = _unitOfWork.BeginTransactionAsync();
            try
            {
                await _placeRepository.DislikePlaceAsync(userId, placeId);
                await _placeRepository.DeleteLikeToPlace(placeId);
                await _unitOfWork.SaveChangesAsync();
                if (transaction != null)
                    await _unitOfWork.CommitAsync();
            }
            catch
            {
                await _unitOfWork.RollbackAsync();
                throw;
            }
        }

        public async Task<PagedResult<PlaceWithReviews>> GetAllLikedPlaces(Guid userId, OnlyPageRequest req)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new InvalidOperationException("User does not exist.");

            var query = _placeRepository.GetAllLikedPlaces(userId);

            var totalCount = await query.CountAsync();

            var places = await query
                .OrderBy(f => f.CreatedAt)
                .Skip((req.Page - 1) * req.PageSize)
                .Take(req.PageSize)
                .ToListAsync();
            places = places.OrderByDescending(p => p.PlaceVotes.FirstOrDefault(v => v.UserId == userId && v.IsHelpful)?.VotedAt).ToList();

            var placeList = _mapper.Map<List<PlaceWithReviews>>(places, opts =>
            {
                opts.Items["UserId"] = userId;
            });

            return new PagedResult<PlaceWithReviews>(
                req.Page,
                req.PageSize,
                totalCount,
                placeList
                );
        }

        public async Task<PagedResult<PlaceWithReviews>> GetPlacesForHome(Guid userId, PageRequestWithLocation req)
        {
            // 1) Load user signals
            var user = await _userRepository.GetUserWithDetailsAsync(userId);
            if (user == null)
                throw new InvalidOperationException("User does not exist.");

            var pref = await _userPrefRepository.GetByUserIdAsync(userId);
            var profile = await _userProfileRepository.GetByUserIdAsync(userId);

            // 2) Candidate generation
            double? lat = req.UserLat;
            double? lng = req.UserLng;
            bool hasLocation = lat.HasValue && lng.HasValue;
            var userPoint = hasLocation ? new NetTopologySuite.Geometries.Point(lng.Value, lat.Value) { SRID = 4326 } : null;

            double? distanceRadiusKm = pref?.DistanceRadius; // km
            double distanceRadiusMeters = distanceRadiusKm.HasValue ? distanceRadiusKm.Value * 1000 : double.MaxValue;

            var branchId = req.BrandId.HasValue ? req.BrandId : user.CurrentBranchId;

            IQueryable<Place> query = _placeRepository.GetPlacesForHome(branchId, req.CategoryId);

            if (hasLocation)
            {
                query = _placeRepository.GetPlacesForHome(branchId, req.CategoryId)
                    .Where(p => p.GeoLocation != null &&
                    p.GeoLocation.Distance(userPoint) <= distanceRadiusMeters);
            }

            // 3) Load list tạm thời (để tính score trong memory)
            var candidates = await query
                .OrderByDescending(p => p.AverageRating)
                .Take(500)
                .Select(p => new
                {
                    p.PlaceId,
                    p.AverageRating,
                    p.TotalReviews,
                    p.TotalLikes,
                    p.PriceLevel,
                    p.AiSuggestedTags,
                    CategoryName = p.PlaceCategory.Name,
                    p.GeoLocation
                })
                .ToListAsync();

            // 4) Tạo set preference tags
            var prefTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (!string.IsNullOrWhiteSpace(pref?.CuisinePreferences))
            {
                prefTags = pref.CuisinePreferences
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(t => t.Trim())
                    .Where(t => !string.IsNullOrWhiteSpace(t))
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);
            }

            // 5) Tính khoảng cách và score
            var scored = new List<(Guid id, double score)>();
            double maxDist = 1.0;

            var distList = candidates.Select(c =>
            {
                double dist = 0;

                if (hasLocation && c.GeoLocation != null)
                {
                    try { dist = c.GeoLocation.Distance(userPoint); }
                    catch { dist = 0; }
                }

                return (c, dist);
            }).ToList();

            maxDist = Math.Max(1.0, distList.Max(x => x.dist));

            const double wDistance = 0.30;
            const double wCategory = 0.25;
            const double wRating = 0.20;
            const double wPrice = 0.10;
            const double wPopularity = 0.15;

            foreach (var (c, dist) in distList)
            {
                // distance
                double distanceScore = hasLocation
                    ? 1.0 - Math.Min(dist / maxDist, 1.0)
                    : 0.5;

                // Tags + category match
                double categoryScore;
                if (prefTags.Count > 0)
                {
                    // Load tags from place
                    var tags = (await _placeTagAssignmentRepository.GetTagsOfPlace(c.PlaceId)).Select(t => t.Name).ToList();

                    if (!string.IsNullOrWhiteSpace(c.CategoryName))
                        tags.Add(c.CategoryName.Trim());

                    double matches = prefTags.Intersect(tags).Count();
                    categoryScore = tags.Count > 0 ? matches / tags.Count : 0;
                }
                else categoryScore = 0.5;

                // Rating
                double ratingScore = Math.Clamp((double)c.AverageRating / 5.0, 0, 1);

                // Price
                double priceScore = 0.5;
                if (pref?.BudgetPreference != null && c.PriceLevel != null)
                {
                    priceScore = 1.0 - (Math.Abs((double)pref.BudgetPreference - c.PriceLevel.Value) / 4.0);
                    priceScore = Math.Clamp(priceScore, 0.0, 1.0);
                }

                // Popularity
                double popularity = c.TotalLikes + c.TotalReviews;
                double popularityScore = popularity > 0
                    ? Math.Clamp(Math.Log10(popularity + 1) / 3.0, 0.0, 1.0)
                    : 0.0;

                double finalScore =
                    wDistance * distanceScore +
                    wCategory * categoryScore +
                    wRating * ratingScore +
                    wPrice * priceScore +
                    wPopularity * popularityScore;

                scored.Add((c.PlaceId, finalScore));
            }


            // 6) Sort & paginate
            var ordered = scored.OrderByDescending(x => x.score).ToList();

            int total = ordered.Count;
            int page = Math.Max(req.Page, 1);
            int pageSize = Math.Clamp(req.PageSize, 1, 100);

            var pagedIds = ordered
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => x.id)
                .ToList();

            var fullPlaces = await _placeRepository.GetPlacesByIdsWithDetailsAsync(pagedIds, userId);

            // 7) Map to DTOs
            var dtos = _mapper.Map<List<PlaceWithReviews>>(fullPlaces, opts =>
            {
                opts.Items["UserId"] = userId;
            });

            return new PagedResult<PlaceWithReviews>(
                Page: page,
                PageSize: pageSize,
                TotalItems: total,
                Items: dtos
            );
        }


        public async Task<PlaceDetailDto> GetPlaceByGooglePlaceIdAsync(string googlePlaceId)
        {
            if (string.IsNullOrWhiteSpace(googlePlaceId))
                return null;

            var place = await _placeRepository.GetByGooglePlaceIdAsync(googlePlaceId);
            if (place == null)
                return null;

            return _mapper.Map<PlaceDetailDto>(place);
        }

        private async Task<ApiResponse<Guid>> NotifyPlaceAction(User actor, Place place, User? moderator,
            PlaceActionType actionType, BoardcastMode boardcastMode,
            object? extraData = null, string? targetRole = null)
        {

            Guid senderId = actor.UserId; //Default
            Guid targetUserId = actor.UserId; //Default
            string title = string.Empty;
            string message = string.Empty;
            string notificationType = "Place";
            string actionTypeString = actionType.ToString();
            string deepLinkUrl = $"/search-places?placeId={place.PlaceId}";
            string sendType = "Info";


			//Determine message content based on action type, for now only Verify action but can be extended later
			switch (actionType)
            {

                case PlaceActionType.VerifyApproved:
                    title = "Place Verification Approved";
                    message = $"A moderator has approve your place suggestion: {place.Name}.";
                    sendType = "Success";
                    senderId = moderator != null ? moderator.UserId : Guid.Empty;
                    targetUserId = actor.UserId;
                    break;

				case PlaceActionType.VerifyRejected:
					title = "Place Verification Rejected";
					message = $"A moderator has reject your place suggestion: {place.Name}.";
					sendType = "Success";
					senderId = moderator != null ? moderator.UserId : Guid.Empty;
					targetUserId = actor.UserId;
                    deepLinkUrl = "";
					break;

			}

            //Boardcast message
            var messageDto = new GeneralNotificationMessage
            {
                Title = title,
                Message = message,
                Type = sendType,
                SenderId = senderId,
                TargetUserId = targetUserId,
                TargetRole = targetRole ?? ""  //Optional
            };

            //Notification Data
            var actionData = new
            {
                ActionType = actionTypeString,
                PerformedBy = actor.FullName,
                PlaceId = place.PlaceId,
                PlaceName = place.Name,
                Extra = extraData,
                ActionAt = DateTimeOffset.UtcNow
            };

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

        /// <summary>
        /// Converts AI suggested tags (comma-separated string) to PlaceTagAssignments when a place is approved.
        /// Only assigns tags that exist in the PlaceTag table (case-insensitive match).
        /// </summary>
        private async Task ConvertAiSuggestedTagsToPlaceTagAssignmentsAsync(Guid placeId, string aiSuggestedTags, Guid moderatorId)
        {
            if (string.IsNullOrWhiteSpace(aiSuggestedTags))
                return;

            // Parse comma-separated tags
            var tagNames = aiSuggestedTags
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(t => t.Trim())
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (!tagNames.Any())
                return;

            // Get all active tags from database
            var allTags = await _placeTagRepository.GetAllPlaceTags()
                .ToListAsync();

            // Find matching tags (case-insensitive)
            var matchedTags = new List<PlaceTag>();
            foreach (var tagName in tagNames)
            {
                var matchedTag = allTags.FirstOrDefault(t => 
                    t.Name.Equals(tagName, StringComparison.OrdinalIgnoreCase));
                
                if (matchedTag != null)
                {
                    matchedTags.Add(matchedTag);
                }
            }

            // Assign matched tags to place
            foreach (var tag in matchedTags)
            {
                try
                {
                    await _placeTagAssignmentRepository.AssignTagIntoPlace(placeId, tag.TagId, moderatorId);
                }
                catch
                {
                    // Skip if tag is already assigned or assignment fails
                    // This prevents duplicate assignments
                    continue;
                }
            }

            // Save all tag assignments
            // Note: VerifyPlaceAsync already saved the place status, so this only saves tag assignments
            await _unitOfWork.CommitAsync();
        }

        public async Task<List<PlaceTagDTO>> GetTagsOfPlace(Guid placeId)
        {
            return await _placeTagAssignmentRepository.GetTagsOfPlace(placeId);
        }
    }
}
