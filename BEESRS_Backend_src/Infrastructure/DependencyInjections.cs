using Infrastructure.Configurations;
using Infrastructure.Interfaces;
using Infrastructure.Interfaces.AdminManage;
using Infrastructure.Interfaces.ConversationsInterface;
using Infrastructure.Interfaces.IPlaceRepos;
using Infrastructure.Interfaces.Personal_Itinerary;
using Infrastructure.Mapper;
using Infrastructure.Repositories;
using Infrastructure.Repositories.AdminManage;
using Infrastructure.Repositories.Converstations_sv;
using Infrastructure.Repositories.Personal_Itinerary;
using Infrastructure.Repositories.PlaceRepos;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure
{
    public static class DependencyInjections
    {
        public static IServiceCollection AddInfratructure(this IServiceCollection services)
        {
            services.AddAutoMapper(typeof(AutoMapperProfile));
            services.AddScoped<IUnitOfWork, UnitOfWork>();

			services.AddScoped<IUserRepository, UserRepository>();
            services.AddScoped<IUserSessionRepository, UserSessionRepository>();
            services.AddScoped<IPasswordResetTokenRepository, PasswordResetTokenRepository>();
            services.AddScoped<IUserProfileRepository,UserProfileRepository>();
            services.AddScoped<IUserPreferenceRepository, UserPreferenceRepository>();
            services.AddScoped<IUserLocationRepository, UserLocationRepository>();
			services.AddScoped<IUserAdminRepository, UserAdminRepository>();
            services.AddScoped<IFriendshipRepository, FriendshipRepository>();

            services.AddScoped<IPlaceRepository, PlaceRepository>();
            services.AddScoped<IPlaceImageRepository, PlaceImageRepository>();
            services.AddScoped<IPlaceReviewRepository, PlaceReviewRepository>();
            services.AddScoped<IReviewImageRepository, ReviewImageRepository>();
            services.AddScoped<IBranchRepository, BranchRepository>();
            services.AddScoped<ISearchHistoryRepository, SearchHistoryRepository>();
            services.AddScoped<ISavedPlaceRepository, SavedPlaceRepository>();

            services.AddScoped<IItineraryRepository, ItineraryRepository>();
            services.AddScoped<IItineraryItemRepository, ItineraryItemRepository>();
            services.AddScoped<IItineraryShareRepository, ItineraryShareRepository>();
            services.AddScoped<IConversationRepository, ConversationRepository>();
            services.AddScoped<IConversationParticipantRepository, ConversationParticipantRepository>();
            services.AddScoped<IMessageRepository, MessageRepository>();
            services.AddScoped<IMessageReadReceiptRepository, MessageReadReceiptRepository>();
            services.AddScoped<ITypingStatusRepository, TypingStatusRepository>();
            services.AddScoped<IChatRepository, ChatRepository>();
            services.AddScoped<IEmployeeRepository, EmployeeRepository>();
            // Event repositories
            services.AddScoped<IEventRepository, EventRepository>();
            services.AddScoped<IEventParticipantRepository, EventParticipantRepository>();
            services.AddScoped<IEventPlaceOptionRepository, EventPlaceOptionRepository>();
            services.AddScoped<IEventVoteRepository, EventVoteRepository>();
            services.AddScoped<IEventAuditLogRepository, EventAuditLogRepository>();
            services.AddScoped<IEventShareRepository, EventShareRepository>();
            services.AddScoped<IEventCheckInRepository, EventCheckInRepository>();
            services.AddScoped<IEventFeedbackRepository, EventFeedbackRepository>();
            services.AddScoped<IEventTemplateRepository, EventTemplateRepository>();
            services.AddScoped<IRecurringEventRepository, RecurringEventRepository>();
            services.AddScoped<IEventWaitlistRepository, EventWaitlistRepository>();

            services.AddScoped<INotificationRepository, NotificationRepository>();

            services.AddScoped<IPlaceTagRepository, PlaceTagRepository>();
            services.AddScoped<IPlaceTagAssignmentRepository, PlaceTagAssignmentRepository>();
            services.AddScoped<ICategoryRepository, CategoryRepository>();
            services.AddScoped<IPlaceReportRepository, PlaceReportRepository>();
            return services;
        }
    }
}
