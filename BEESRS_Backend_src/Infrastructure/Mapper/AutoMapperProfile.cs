using AutoMapper;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Models.AdminManageModel;
using Infrastructure.Models.BranchDTO;
using Infrastructure.Models.Chat;
using Infrastructure.Models.Converstation;
using Infrastructure.Models.DTOs;
using Infrastructure.Models.ItineraryDTO;
using Infrastructure.Models.ItineraryItemDTO;
using Infrastructure.Models.ItineraryShareDTO;
using Infrastructure.Models.NotificationDTO;
using Infrastructure.Models.PlaceDTO;
using Infrastructure.Models.PlaceReview;
using Infrastructure.Models.UserDTO;
using Infrastructure.Models.UserLocationDTO;
using Infrastructure.Models.UserPreferenceDTO;
using Infrastructure.Models.UserProfileDTO;
using NetTopologySuite.Geometries;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Infrastructure.Mapper
{
	public class AutoMapperProfile : Profile
	{
		public AutoMapperProfile()
		{
			CreateMap<User, UserInfoDto>()
				  .ForMember(dest => dest.RoleName, opt => opt.MapFrom(src => src.Role.RoleName))
				  .ForMember(dest => dest.Profile, opt => opt.MapFrom(src => src.UserProfile))
				  .ForMember(dest => dest.CurrentBranch, opt => opt.MapFrom(src => src.CurrentBranch.Name));

            CreateMap<Employee, Infrastructure.Models.Employe.EmployeeDto>()
                .ForMember(d => d.BranchName, o => o.MapFrom(s => s.Branch != null ? s.Branch.Name : null));
            CreateMap<Infrastructure.Models.Employe.CreateEmployeeDto, Employee>()
                .ForMember(d => d.CreatedAt, o => o.MapFrom(_ => DateTimeOffset.UtcNow))
                .ForMember(d => d.Status, o => o.MapFrom(s => s.Status ?? Domain.Enums.EmployeeStatus.Inactive))
                .ForMember(d => d.EmployeeId, o => o.MapFrom(s => string.IsNullOrWhiteSpace(s.EmployeeId) ? null : s.EmployeeId));

            CreateMap<Infrastructure.Models.Employe.UpsertEmployeeDto, Employee>()
                .ForMember(d => d.CreatedAt, o => o.Ignore())
                .ForMember(d => d.Status, o => o.MapFrom(s => s.Status ?? Domain.Enums.EmployeeStatus.Inactive))
                .ForMember(d => d.EmployeeId, o => o.MapFrom(s => string.IsNullOrWhiteSpace(s.EmployeeId) ? null : s.EmployeeId));
            // UserProfile to UserProfileDto (Probably not needed)
            CreateMap<UserProfile, UserProfileDetailDto>();

			// RegisterDto to User (if needed for direct mapping)
			CreateMap<RegisterDto, User>()
				.ForMember(dest => dest.UserId, opt => opt.Ignore())
				.ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
				.ForMember(dest => dest.RoleId, opt => opt.MapFrom(src => 3)) // Default User role
				.ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email.ToLowerInvariant()))
				.ForMember(dest => dest.EmailVerified, opt => opt.MapFrom(src => false))
				.ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true))
				.ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTimeOffset.UtcNow))
				.ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(src => DateTimeOffset.UtcNow))
				.ForMember(dest => dest.FailedLoginAttempts, opt => opt.MapFrom(src => 0));

			// RegisterDto to UserProfile
			CreateMap<RegisterDto, UserProfile>()
				.ForMember(dest => dest.ProfileId, opt => opt.Ignore())
				.ForMember(dest => dest.UserId, opt => opt.Ignore())
				.ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTimeOffset.UtcNow))
				.ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(src => DateTimeOffset.UtcNow));

			// RegisterDto to UserPreferences
			CreateMap<RegisterDto, UserPreference>()
				.ForMember(dest => dest.PreferenceId, opt => opt.Ignore())
				.ForMember(dest => dest.UserId, opt => opt.Ignore())
				.ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => DateTimeOffset.UtcNow))
				.ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(src => DateTimeOffset.UtcNow));

			CreateMap<User, UserListItemDto>()
                .ForCtorParam("FullName", opt => opt.MapFrom(src => src.FirstName + " " + src.LastName))
				.ForMember(dest => dest.CurrentBranchName, opt => opt.MapFrom(s => s.CurrentBranch != null ? s.CurrentBranch.Name : "Unknown"))
				.ForCtorParam("RoleName", opt => opt.MapFrom(s => s.Role.RoleName));

			// CreateDto to UserProfile
			CreateMap<UserProfileCreateDto, UserProfile>()
				.ForMember(dest => dest.ProfileId, opt => opt.Ignore())
				.ForMember(dest => dest.ProfilePictureUrl, opt => opt.Ignore()) // Avatar handled separately
				.ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTimeOffset.Now))
				.ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTimeOffset.Now));

			// UpdateDto to UserProfile
			CreateMap<UserProfileUpdateDto, UserProfile>()
				.ForMember(dest => dest.ProfileId, opt => opt.Ignore())
				.ForMember(dest => dest.ProfilePictureUrl, opt => opt.Ignore()) // Avatar handled separately
				.ForMember(dest => dest.CreatedAt, opt => opt.Ignore()) // Don’t overwrite CreatedAt
				.ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTimeOffset.Now));

			// UserProfile to ViewDto
			CreateMap<UserProfile, UserProfileViewDto>();
			CreateMap<User, UserProfileViewDto>()
				.ForMember(dest => dest.ProfileId, opt => opt.MapFrom(src => src.UserProfile.ProfileId))
				.ForMember(dest => dest.FirstName, opt => opt.MapFrom(src => src.FirstName))
				.ForMember(dest => dest.LastName, opt => opt.MapFrom(src => src.LastName))
				.ForMember(dest => dest.FullName, opt => opt.MapFrom(src => src.FullName))
				.ForMember(dest => dest.HomeCountry, opt => opt.MapFrom(src => src.UserProfile.HomeCountry))
				.ForMember(dest => dest.CurrentBranch, opt => opt.MapFrom(src => src.CurrentBranch != null ? src.CurrentBranch.Name : "Unknown"))
                .ForMember(dest => dest.ProfilePictureUrl, opt => opt.MapFrom(src => src.UserProfile.ProfilePictureUrl))
				.ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.UserProfile.UpdatedAt))
				.ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(src => src.UserProfile.UpdatedAt));

            // UserProfile to DetailDto
            CreateMap<UserProfile, UserProfileDetailDto>()
				.ForMember(dest => dest.CurrentBranch, opt => opt.MapFrom(src => src.User.CurrentBranch != null ? src.User.CurrentBranch.Name : "Unknown"));

            // CreateDto to UserPreference
            CreateMap<UserPreferenceCreateDto, UserPreference>()
				.ForMember(dest => dest.PreferenceId, opt => opt.Ignore())
				.ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTimeOffset.Now))
				.ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTimeOffset.Now));

			// UpdateDto to UserPreference
			CreateMap<UserPreferenceUpdateDto, UserPreference>();

			// UserPreference to ViewDto
			CreateMap<UserPreference, UserPreferenceViewDto>();

			// UserPreference to DetailDto
			CreateMap<UserPreference, UserPreferenceDetailDto>();

			// CreateDto to UserLocation
			CreateMap<UserLocationCreateDto, UserLocation>()
				.ForMember(dest => dest.LocationId, opt => opt.Ignore())
				.ForMember(dest => dest.RecordedAt, opt => opt.MapFrom(_ => DateTimeOffset.Now));

			// UpdateDto to UserLocation
			CreateMap<UserLocationUpdateDto, UserLocation>()
				.ForMember(dest => dest.LocationId, opt => opt.Ignore())  // Keep original
				.ForMember(dest => dest.RecordedAt, opt => opt.Ignore()); // Don’t overwrite history

			// UserLocation to ViewDto
			CreateMap<UserLocation, UserLocationViewDto>();

			// UserLocation to DetailDto
			CreateMap<UserLocation, UserLocationDetailDto>();


			// Place mapper
			CreateMap<Place, PlaceList>()
				.ForMember(dest => dest.CategoryName, opt => opt.MapFrom(src => src.PlaceCategory.Name));
			CreateMap<Place, PlaceListItemDto>()
				.ForMember(dest => dest.CategoryName, opt => opt.MapFrom(src => src.PlaceCategory.Name));
			CreateMap<Place, PlaceDetail>()
				.ForMember(dest => dest.CategoryName, opt => opt.MapFrom(src => src.PlaceCategory.Name))
                .ForMember(dest => dest.CreatedByUserId, opt => opt.MapFrom(src => src.CreatedBy))
                .ForMember(dest => dest.CreatedBy, opt => opt.MapFrom(src => src.CreatedByUser.FullName))
				.ForMember(dest => dest.CreatedByAvatar, opt => opt.MapFrom(src => src.CreatedByUser.UserProfile.ProfilePictureUrl))
                .ForMember(dest => dest.ImageUrls, opt => opt.MapFrom(src => src.PlaceImages))
                .ForMember(dest => dest.LastReviewedAt, opt => opt.MapFrom(src => src.PlaceReviews.OrderByDescending(r => r.UpdatedAt).FirstOrDefault().UpdatedAt))
                .ForMember(dest => dest.IsLikedByCurrentUser, opt => opt.MapFrom((src, dest, destMember, context) =>
                     src.PlaceVotes.Any(v => v.UserId == (Guid)context.Items["UserId"] && v.IsHelpful)))
                .ForMember(dest => dest.IsSavedByCurrentUser, opt => opt.MapFrom(src => src.SavedPlaces.Any()));

            CreateMap<Place, PlaceDetailForHome>()
                .ForMember(dest => dest.CategoryName, opt => opt.MapFrom(src => src.PlaceCategory.Name))
                .ForMember(dest => dest.CreatedByUserId, opt => opt.MapFrom(src => src.CreatedBy))
                .ForMember(dest => dest.CreatedBy, opt => opt.MapFrom(src => src.CreatedByUser.FullName))
                .ForMember(dest => dest.CreatedByAvatar, opt => opt.MapFrom(src => src.CreatedByUser.UserProfile.ProfilePictureUrl))
                .ForMember(dest => dest.ImageUrls, opt => opt.MapFrom(src => src.PlaceImages))
                .ForMember(dest => dest.LastReviewedAt, opt => opt.MapFrom(src => src.PlaceReviews.OrderByDescending(r => r.UpdatedAt).FirstOrDefault().UpdatedAt));

            CreateMap<Place, PlaceDetailDto>()
                .ForMember(dest => dest.GooglePlaceId, opt => opt.MapFrom(src => src.GooglePlaceId ?? string.Empty))
                .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name ?? string.Empty))
                .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Description ?? string.Empty))
                .ForMember(dest => dest.Latitude, opt => opt.MapFrom(src => (decimal)src.Latitude))
                .ForMember(dest => dest.Longitude, opt => opt.MapFrom(src => (decimal)src.Longitude))
                .ForMember(dest => dest.AddressLine1, opt => opt.MapFrom(src => src.AddressLine1 ?? string.Empty))
                .ForMember(dest => dest.City, opt => opt.MapFrom(src => src.City ?? string.Empty))
                .ForMember(dest => dest.StateProvince, opt => opt.MapFrom(src => src.StateProvince ?? string.Empty))
                .ForMember(dest => dest.PhoneNumber, opt => opt.MapFrom(src => src.PhoneNumber ?? string.Empty))
                .ForMember(dest => dest.WebsiteUrl, opt => opt.MapFrom(src => src.WebsiteUrl ?? string.Empty))
                .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email ?? string.Empty))
                .ForMember(dest => dest.VerificationStatus, opt => opt.MapFrom(src => src.VerificationStatus.ToString()));

            CreateMap<CreatePlaceDto, Place>();
			CreateMap<UpdatePlaceDTO, Place>();

			CreateMap<Place, PlaceWithReviews>()
                .ForMember(dest => dest.PlaceDetail, opt => opt.MapFrom(src => src))
				.ForMember(dest => dest.Reviews, opt => opt.MapFrom(src => src.PlaceReviews));

            // PlaceReview mapper
            CreateMap<PlaceReview, ReviewDetailDTO>()
                .ForMember(dest => dest.ReviewImageUrls, opt => opt.MapFrom(src => src.ReviewImages.Select(img => img.ImageUrl)))
                .ForMember(dest => dest.FullName, opt => opt.MapFrom(src => src.User != null ? src.User.FullName : "Unknown"))
				.ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Place != null ? src.Place.Name : "Unknown"))
				.ForMember(dest => dest.ProfilePictureUrl, opt => opt.MapFrom(src => src.User != null && src.User.UserProfile != null ? src.User.UserProfile.ProfilePictureUrl : null));

			CreateMap<PlaceReview, ReviewDetailForUser>()
                .ForMember(dest => dest.ReviewImageUrls, opt => opt.MapFrom(src => src.ReviewImages.Select(img => img.ImageUrl)))
                .ForMember(dest => dest.FullName, opt => opt.MapFrom(src => src.User != null ? src.User.FullName : "Unknown"))
                .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Place != null ? src.Place.Name : "Unknown"))
                .ForMember(dest => dest.ProfilePictureUrl, opt => opt.MapFrom(src => src.User != null && src.User.UserProfile != null ? src.User.UserProfile.ProfilePictureUrl : null))
                .ForMember(dest => dest.IsReviewByCurrentUser, opt => opt.MapFrom((src, dest, destMember, context) =>
                     src.UserId == (Guid)context.Items["UserId"]))
                .ForMember(dest => dest.isHelpfulByCurrentUser, opt => opt.MapFrom((src, dest, destMember, context) =>
                     src.ReviewVotes.Any(v => v.UserId == (Guid)context.Items["UserId"] && v.IsHelpful)));

            CreateMap<CreatePlaceReviewDTO, PlaceReview>();
			CreateMap<UpdatePlaceReviewDTO, PlaceReview>();

			CreateMap<PlaceReview, ReviewWithReport>()
				.ForMember(dest => dest.FullName, opt => opt.MapFrom(src => src.User != null ? src.User.FullName : "Unknown"))
				.ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Place != null ? src.Place.Name : "Unknown"))
				.ForMember(dest => dest.ProfilePictureUrl, opt => opt.MapFrom(src => src.User != null && src.User.UserProfile != null ? src.User.UserProfile.ProfilePictureUrl : null));
            CreateMap<PlaceReviewReport, ReviewReportDTO>()
				.ForMember(dest => dest.ReportedByUserProfilePictureUrl, opt => opt.MapFrom(src => src.ReportedByUser != null ? src.ReportedByUser.UserProfile.ProfilePictureUrl : "Unknown"))
				.ForMember(dest => dest.ReportedByUserFullName, opt => opt.MapFrom(src => src.ReportedByUser != null ? src.ReportedByUser.FullName : "Unknown"));

            // PlaceCategory mapper
            CreateMap<PlaceCategory, PlaceCategoryDTO>().ReverseMap();

            // Image Place mapper
            CreateMap<CreatePlaceImgeDTO, PlaceImage>();
			CreateMap<PlaceImage, PlaceImageDTO>();

            // Branch mapper
			CreateMap<Branch, BranchDTO>()
				.ForMember(dest => dest.CityName, opt => opt.MapFrom(src => src.City != null ? src.City.Name : null))
				.ForMember(dest => dest.CountryName, opt => opt.MapFrom(src => src.Country != null ? src.Country.Name : null))
				.ReverseMap();
			CreateMap<CreateBranchDTO, Branch>();
			CreateMap<UpdateBranchDTO, Branch>();

			// Friendshp mapper
			CreateMap<Friendship, FriendRequest>()
                .ForMember(dest => dest.ProfilePictureUrl, opt => opt.MapFrom(src => src.Requested != null ? src.Requested.UserProfile.ProfilePictureUrl : "Unknown"))
                .ForMember(dest => dest.FullName, opt => opt.MapFrom(src => src.Requested != null ? src.Requested.FullName : "Unknown"));

			CreateMap<Friendship, FriendList>()

                .ForMember(dest => dest.UserId, opt => opt.MapFrom((src, dest, destMember, context) =>
                    src.RequestedId != (Guid)context.Items["UserId"]
                        ? src.RequestedId
                        : src.AddresseeId))
                .ForMember(dest => dest.FullName, opt => opt.MapFrom((src, dest, destMember, context) =>
					src.RequestedId != (Guid)context.Items["UserId"]
						? src.Requested.FullName
						: src.Addressee.FullName))
				.ForMember(dest => dest.ProfilePictureUrl, opt => opt.MapFrom((src, dest, destMember, context) =>
					src.RequestedId != (Guid)context.Items["UserId"]
						? src.Requested?.UserProfile?.ProfilePictureUrl
						: src.Addressee?.UserProfile?.ProfilePictureUrl));

			CreateMap<User, FriendSuggestion>()
				.ForMember(dest => dest.ProfilePictureUrl, opt => opt.MapFrom(src => src.UserProfile.ProfilePictureUrl))
                .ForMember(dest => dest.BranchName, opt => opt.MapFrom(src => src.CurrentBranch.Name));

            // CreateDto to Entity
            CreateMap<ItineraryCreateNewDto, Itinerary>()
                .ForMember(dest => dest.ItineraryId, opt => opt.Ignore()) // Generated by DB/Guid.NewGuid()
                .ForMember(dest => dest.User, opt => opt.Ignore()) // Navigation property
                .ForMember(dest => dest.ItineraryItems, opt => opt.Ignore()) // handled separately
                .ForMember(dest => dest.ItineraryShares, opt => opt.Ignore()) // handled separately
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTimeOffset.UtcNow))
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.CompletedAt, opt => opt.Ignore()) // Only set later
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => string.IsNullOrEmpty(src.Status) ? "draft" : src.Status))
                .ForMember(dest => dest.ItineraryImageUrl, opt => opt.MapFrom(src => string.IsNullOrEmpty(src.ItineraryImageUrl) ? string.Empty : src.ItineraryImageUrl));

			CreateMap<ItineraryCreateAsTemplateDto, Itinerary>()
			   .ForMember(dest => dest.ItineraryId, opt => opt.Ignore()) // Generated by DB/Guid.NewGuid()
			   .ForMember(dest => dest.User, opt => opt.Ignore()) // Navigation property
			   .ForMember(dest => dest.ItineraryItems, opt => opt.Ignore()) // handled separately
			   .ForMember(dest => dest.ItineraryShares, opt => opt.Ignore()) // handled separately
			   .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTimeOffset.UtcNow))
			   .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
			   .ForMember(dest => dest.CompletedAt, opt => opt.Ignore()) // Only set later
			   .ForMember(dest => dest.Status, opt => opt.MapFrom(src => string.IsNullOrEmpty(src.Status) ? "draft" : src.Status))
			   .ForMember(dest => dest.ItineraryImageUrl, opt => opt.MapFrom(src => string.IsNullOrEmpty(src.ItineraryImageUrl) ? string.Empty : src.ItineraryImageUrl));

			// UpdateDto to Entity
			CreateMap<ItineraryUpdateDto, Itinerary>()
                .ForMember(dest => dest.ItineraryId, opt => opt.Ignore()) // Generated by DB/Guid.NewGuid()
                .ForMember(dest => dest.User, opt => opt.Ignore()) // Navigation property
                .ForMember(dest => dest.ItineraryItems, opt => opt.Ignore()) // handled separately
                .ForMember(dest => dest.ItineraryShares, opt => opt.Ignore()) // handled separately
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTimeOffset.UtcNow))
                .ForMember(dest => dest.CompletedAt, opt => opt.Ignore()) // Only set later
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => string.IsNullOrEmpty(src.Status) ? "draft" : src.Status))
                .ForMember(dest => dest.ItineraryImageUrl, opt => opt.Condition(src => src.ItineraryImageUrl != null)); // Only map if provided

            // Entity to ViewDto
            CreateMap<Itinerary, ItineraryViewDto>();

            // Entity to DetailDto
            CreateMap<Itinerary, ItineraryDetailDto>();

            //Entity to DetailDto
            CreateMap<ItineraryItem, ItineraryItemDetailDto>();

            // CreateDto to Entity
            CreateMap<ItineraryItemCreateDto, ItineraryItem>()
                .ForMember(dest => dest.ItemId, opt => opt.Ignore()) // Generated by DB/Guid.NewGuid()
                .ForMember(dest => dest.Itinerary, opt => opt.Ignore()) // Navigation property
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTimeOffset.UtcNow))
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.BookingReference, opt => opt.MapFrom(src => src.BookingReference ?? string.Empty))
                .ForMember(dest => dest.BookingStatus, opt => opt.MapFrom(src => src.BookingStatus ?? string.Empty))
                .ForMember(dest => dest.TransportMethod, opt => opt.MapFrom(src => src.TransportMethod ?? string.Empty))
                .ForMember(dest => dest.CompletionNotes, opt => opt.MapFrom(src => src.CompletionNotes ?? string.Empty))
                .ForMember(dest => dest.ActivityDescription, opt => opt.MapFrom(src => src.ActivityDescription ?? string.Empty));

			CreateMap<ItineraryItemUpdateDto, ItineraryItem>()
				.ForMember(dest => dest.ItemId, opt => opt.Ignore()) // Generated by DB/Guid.NewGuid()
				.ForMember(dest => dest.Itinerary, opt => opt.Ignore()) // Navigation property
				.ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
				.ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTimeOffset.UtcNow))
				.ForMember(dest => dest.BookingReference, opt => opt.MapFrom(src => src.BookingReference ?? string.Empty))
				.ForMember(dest => dest.BookingStatus, opt => opt.MapFrom(src => src.BookingStatus ?? string.Empty))
				.ForMember(dest => dest.TransportMethod, opt => opt.MapFrom(src => src.TransportMethod ?? string.Empty))
				.ForMember(dest => dest.CompletionNotes, opt => opt.MapFrom(src => src.CompletionNotes ?? string.Empty))
				.ForMember(dest => dest.ActivityDescription, opt => opt.MapFrom(src => src.ActivityDescription ?? string.Empty));

			CreateMap<ItineraryShareCreateDto, ItineraryShare>()
				.ForMember(dest => dest.ShareId, opt => opt.Ignore())
				.ForMember(dest => dest.Itinerary, opt => opt.Ignore())
				.ForMember(dest => dest.SharedByUser, opt => opt.Ignore())
				.ForMember(dest => dest.SharedWithUser, opt => opt.Ignore())
				.ForMember(dest => dest.SharedAt, opt => opt.Ignore());

			CreateMap<ItineraryShare, ItineraryShareDetailDto>()
				.ForMember(
					dest => dest.SharedWithUser,
					opt => opt.MapFrom(src => src.SharedWithUser == null ? null : new SharedWithUser
					{
						UserName = src.SharedWithUser.FullName,
						Email = src.SharedWithUser.Email,
						Avatar = src.SharedWithUser.UserProfile.ProfilePictureUrl
					})
				);

			CreateMap<ItineraryShare, ItineraryShareViewDto>();

			CreateMap<Itinerary, ItineraryTemplateDto>();

            // ==================== NEW CONVERSATION MAPPINGS ====================

            // Entity to DTO mappings
            CreateMap<Conversation, ConversationDto>()
                .ForMember(dest => dest.Participants, opt => opt.MapFrom(src => src.Participants))
                .ForMember(dest => dest.LastMessage, opt => opt.Ignore()) // Handled in service
                .ForMember(dest => dest.UnreadCount, opt => opt.Ignore()); // Handled in service

            CreateMap<ConversationParticipant, ParticipantDto>()
                .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.User.FirstName))
                .ForMember(dest => dest.UserAvatar, opt => opt.MapFrom(src => src.User.UserProfile.ProfilePictureUrl))
                .ForMember(dest => dest.IsOnline, opt => opt.MapFrom(src => false)); // Default, implement online logic separately

            CreateMap<Message, MessageDto>()
                .ForMember(dest => dest.SenderName, opt => opt.MapFrom(src => src.Sender.FullName))
                .ForMember(dest => dest.SenderAvatar, opt => opt.MapFrom(src => src.Sender.UserProfile.ProfilePictureUrl))
                .ForMember(dest => dest.ReplyToMessage, opt => opt.Ignore()) // Handled separately to avoid circular reference
                .ForMember(dest => dest.ReadReceipts, opt => opt.MapFrom(src => src.ReadReceipts))
                .ForMember(dest => dest.IsRead, opt => opt.Ignore()); // Handled in service

            CreateMap<MessageReadReceipt, ReadReceiptDto>()
                .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.User.FullName));

            CreateMap<TypingStatus, TypingStatusDto>()
                .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.User.FullName));

            // DTO to Entity mappings
            CreateMap<CreateConversationDto, Conversation>()
                .ForMember(dest => dest.ConversationId, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedBy, opt => opt.Ignore()) // Set in service
                .ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => true))
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTimeOffset.UtcNow))
                .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTimeOffset.UtcNow))
                .ForMember(dest => dest.LastMessageAt, opt => opt.Ignore())
                .ForMember(dest => dest.Creator, opt => opt.Ignore())
                .ForMember(dest => dest.Participants, opt => opt.Ignore())
                .ForMember(dest => dest.Messages, opt => opt.Ignore())
                .ForMember(dest => dest.ConversationAvatar, opt => opt.MapFrom(src =>
                    string.IsNullOrWhiteSpace(src.ConversationAvatar) ? null : src.ConversationAvatar));

            CreateMap<SendMessageDto, Message>()
                .ForMember(dest => dest.MessageId, opt => opt.Ignore())
                .ForMember(dest => dest.SenderId, opt => opt.Ignore()) // Set in service
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTimeOffset.UtcNow))
                .ForMember(dest => dest.IsEdited, opt => opt.MapFrom(src => false))
                .ForMember(dest => dest.IsDeleted, opt => opt.MapFrom(src => false))
                .ForMember(dest => dest.EditedAt, opt => opt.Ignore())
                .ForMember(dest => dest.DeletedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Conversation, opt => opt.Ignore())
                .ForMember(dest => dest.Sender, opt => opt.Ignore())
                .ForMember(dest => dest.ReplyToMessage, opt => opt.Ignore())
                .ForMember(dest => dest.ReadReceipts, opt => opt.Ignore());
            // Conversation mappings
            CreateMap<ChatConversation, ChatBotDto>()
                .ForMember(dest => dest.Messages, opt => opt.MapFrom(src => src.Messages));

            CreateMap<ChatBotDto, ChatConversation>();

            // Conversation mappings
            CreateMap<ChatConversation, ChatBotDto>()
                .ForMember(dest => dest.Messages, opt => opt.MapFrom(src => src.Messages));

            CreateMap<ConversationDto, Conversation>();

            // ChatMessage mappings
            CreateMap<ChatMessage, ChatBotMessageDto>()
                .ForMember(dest => dest.ReferencedPlaces, opt => opt.MapFrom(src =>
                    string.IsNullOrEmpty(src.ReferencedPlaces)
                        ? null
                        : JsonSerializer.Deserialize<object>(src.ReferencedPlaces, _jsonOptions)));

            CreateMap<ChatBotMessageDto, ChatMessage>()
                .ForMember(dest => dest.ReferencedPlaces, opt => opt.MapFrom(src =>
                    src.ReferencedPlaces == null
                        ? null
                        : JsonSerializer.Serialize(src.ReferencedPlaces, _jsonOptions)));

			//Notification
			
			CreateMap<Notification, NotificationDetailDto>();
			CreateMap<Notification, NotificationViewDto>();

			CreateMap<CreateNotificationDto, Notification>()
				.ForMember(dest => dest.NotificationId, opt => opt.Ignore())
				.ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
				.ForMember(dest => dest.ReadAt, opt => opt.Ignore()) 
				.ForMember(dest => dest.EmailSentAt, opt => opt.Ignore())
				.ForMember(dest => dest.PushSentAt, opt => opt.Ignore())
				.ForMember(dest => dest.ExpiresAt, opt => opt.Ignore());

			CreateMap<UpdateNotificationDto, Notification>()
				.ForMember(dest => dest.NotificationId, opt => opt.Ignore()) 
				.ForMember(dest => dest.CreatedAt, opt => opt.Ignore()) 
				.ForMember(dest => dest.ReadAt, opt => opt.Ignore()) 
				.ForMember(dest => dest.EmailSentAt, opt => opt.Ignore())
				.ForMember(dest => dest.PushSentAt, opt => opt.Ignore())
				.ForMember(dest => dest.ExpiresAt, opt => opt.Ignore());

            // Place category mapper
            CreateMap<PlaceCategory, PlaceCategoryDTO>().ReverseMap();
            CreateMap<CreateCategoryDTO, PlaceCategory>();
            CreateMap<UpdateCategoryDTO, PlaceCategory>();

			// Place tag mapper
			CreateMap<PlaceTag, PlaceTagDTO>().ReverseMap();
			CreateMap<CreatePlaceTagDTO, PlaceTag>();
			CreateMap<UpdatePlaceTagDTO, PlaceTag>();

			CreateMap<PlaceReport, PlaceReportDTO>()
                .ForMember(dest => dest.FullName, opt => opt.MapFrom(src => src.ReportedByUser.FullName))
				.ForMember(dest => dest.ProfilePictureUrl, opt => opt.MapFrom(src => src.ReportedByUser.UserProfile.ProfilePictureUrl));

			CreateMap<CreateSearchHistory, SearchHistory>()
                .ForMember(dest => dest.SearchLocation, opt => opt.MapFrom(src =>
					(src.Latitude != null && src.Longitude != null)
						? new Point(src.Longitude.Value, src.Latitude.Value) { SRID = 4326 }
						: null));
            CreateMap<SearchHistory, SearchHistoryDTO>();

        }

        private static readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = false
        };
    }
}
