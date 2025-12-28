using Application.BackgroundServices;
using Application.Helper;
using Application.Interfaces;
using Application.Interfaces.AdminManage;
using Application.Interfaces.ItineraryService;
using Application.Interfaces.ThirdParty;
using Application.Services;
using Application.Services.AdminManage;
using Application.Services.ItineraryService;
using Application.Services.ThirdParty;
using Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application
{
    public static class DependencyInjections
    {
        public static IServiceCollection AddApplication(this IServiceCollection services)
        {
            services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
            
            // Background services
            services.AddHostedService<TokenCleanupService>();
            services.AddHostedService<EventCompletionBackgroundService>();
            services.AddHostedService<EventAutoFinalizeBackgroundService>();
            services.AddHostedService<EventReminderBackgroundService>();
            services.AddHostedService<RecurringEventGenerationService>();
            services.AddHostedService<EventAutoCancelBackgroundService>();
            
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<ITokenService, TokenService>();
            services.AddScoped<IEmailService, EmailService>();
            services.AddScoped<IAdminUserService, AdminUserService>();
            services.AddScoped<IModeratorDashboardService, ModeratorDashboardService>();
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IUserPreferenceService, UserPreferenceService>();
            services.AddScoped<IUserLocationService, UserLocationService>();
			services.AddScoped<IPlaceService, PlaceService>();
            services.AddScoped<IPlaceReviewService, PlaceReviewService>();
            services.AddScoped<IItineraryService, ItineraryService>();
            services.AddScoped<IRouteCalculationService, RouteCalculationService>();
			services.AddSingleton<ICloudinaryHelper, CloudinaryHelper>();
            services.AddScoped<IItineraryItemService, ItineraryItemService>();
            services.AddScoped<IItineraryShareService, ItineraryShareService>();
			services.AddScoped<IRouteCalculationService, RouteCalculationService>();
            services.AddScoped<IItineraryTemplateService, ItineraryTemplateService>();
            services.AddScoped<IItineraryExportService, ItineraryExportService>();
            services.AddScoped<IItineraryStatisticService, ItineraryStatisticService>();

            services.AddScoped<IFriendshipService, FriendshipService>();
            services.AddScoped<IBranchService, BranchService>();
            services.AddScoped<ISavedPlaceService, SavedPlaceService>();
            services.AddScoped<ISearchHistoryService, SearchHistoryService>();

            services.AddScoped<IConverstationService,ConverstationService>();
            services.AddScoped<IIntentDetectionService, IntentDetectionService>();
            services.AddScoped<IChatService, ChatService>();
            services.AddScoped<IEmployeeService, EmployeeService>();
            services.AddScoped<INotificationService, NotificationService>();

            // Event services
            services.AddScoped<IEventService, EventService>();
            services.AddScoped<IEventStateMachine, EventStateMachine>();
            services.AddScoped<IPreferenceAggregationService, PreferenceAggregationService>();
            services.AddScoped<IEventShareService, EventShareService>();
            
            // AI Recommendation: Choose between standard or enhanced
            // Comment out one of these two lines based on configuration
            // services.AddScoped<IAIRecommendationService, AIRecommendationService>(); // Standard
            services.AddScoped<IAIRecommendationService, EnhancedAIRecommendationService>(); // Enhanced with system places + Gemini
            
            services.AddScoped<IVenueScoringService, VenueScoringService>();
            services.AddScoped<IVoteService, VoteService>();
            services.AddScoped<IAuditLogService, AuditLogService>();
            services.AddScoped<IEventAnalyticsService, EventAnalyticsService>();

            services.AddScoped<Application.Interfaces.ThirdParty.ITrackAsiaService, Application.Services.ThirdParty.TrackAsiaService>();
			services.AddScoped<IMapBoxService, MapBoxService>();
			services.AddScoped<Application.Interfaces.ThirdParty.IGeminiAIService, Application.Services.ThirdParty.GeminiAIService>();
            services.AddScoped<IContentSafetyService, ContentSafetyService>();

            services.AddScoped<IPlaceCategoryService, PlaceCategoryService>();
            services.AddScoped<IPlaceTagService, PlaceTagService>();
            services.AddScoped<IPlaceReportService, PlaceReportService>();

            return services;

        }
    }
}
