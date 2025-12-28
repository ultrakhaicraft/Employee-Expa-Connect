using Application.Interfaces;
using AutoMapper;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Models.UserDTO;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Application.Services
{
    public class ModeratorDashboardService : IModeratorDashboardService
    {
        private readonly IUserRepository _userRepository;
        private readonly IMapper _mapper;
        private readonly Infrastructure.Persistence.BEESRSDBContext _context;

        public ModeratorDashboardService(IUserRepository userRepository, IMapper mapper, Infrastructure.Persistence.BEESRSDBContext context)
        {
            _userRepository = userRepository;
            _mapper = mapper;
            _context = context;
        }

        public async Task<PagedResult<UserListItemDto>> GetUsersInBranchAsync(Guid moderatorId, PagedRequest req)
        {
            var moderator = await _userRepository.GetByIdAsync(moderatorId);
            if (moderator == null)
            {
                throw new Exception("Moderator not found");
            }

            var branchId = moderator.CurrentBranchId;
            var pagedUsers = await _userRepository.GetUsersInBranchPagedAsync(branchId, req);

            var items = pagedUsers.Items.Select(u => _mapper.Map<UserListItemDto>(u)).ToList();

            return new PagedResult<UserListItemDto>(
                pagedUsers.Page,
                pagedUsers.PageSize,
                pagedUsers.TotalItems,
                items
            );
        }

        public async Task<bool> ToggleUserStatusAsync(Guid moderatorId, Guid userId)
        {
            var moderator = await _userRepository.GetByIdAsync(moderatorId);
            if (moderator == null)
            {
                throw new Exception("Moderator not found");
            }

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new Exception("User not found");
            }

            // Prevent managing admins
            if (user.RoleId == (int)RoleEnum.Admin)
            {
                throw new UnauthorizedAccessException("You don't have permission to manage admin users");
            }

            // Verify user belongs to moderator's branch
            if (user.CurrentBranchId != moderator.CurrentBranchId)
            {
                throw new UnauthorizedAccessException("You don't have permission to manage users outside your branch");
            }

            // Prevent moderator from deactivating themselves
            if (user.UserId == moderatorId)
            {
                throw new InvalidOperationException("You cannot deactivate yourself");
            }

            user.IsActive = !user.IsActive;
            await _userRepository.UpdateAsync(user);

            return true;
        }

        public async Task<UserInfoDto> GetUserDetailsAsync(Guid moderatorId, Guid userId)
        {
            var moderator = await _userRepository.GetByIdAsync(moderatorId);
            if (moderator == null)
            {
                throw new Exception("Moderator not found");
            }

            var user = await _userRepository.GetUserWithDetailsAsync(userId);
            if (user == null)
            {
                throw new Exception("User not found");
            }

            // Prevent viewing admins
            if (user.RoleId == (int)RoleEnum.Admin)
            {
                throw new UnauthorizedAccessException("You don't have permission to view admin users");
            }

            // Verify user belongs to moderator's branch
            if (user.CurrentBranchId != moderator.CurrentBranchId)
            {
                throw new UnauthorizedAccessException("You don't have permission to view users outside your branch");
            }

            return _mapper.Map<UserInfoDto>(user);
        }

        public async Task<ModeratorAnalyticsDto> GetAnalyticsAsync(Guid moderatorId)
        {
            var moderator = await _userRepository.GetByIdAsync(moderatorId);
            if (moderator == null)
            {
                throw new Exception("Moderator not found");
            }

            var branchId = moderator.CurrentBranchId;

            // 1. User Stats
            var usersInBranch = await _context.Users
                .Include(u => u.Role)
                .Where(u => u.CurrentBranchId == branchId && u.RoleId != (int)RoleEnum.Admin)
                .ToListAsync();

            var userStats = new UserAnalytics
            {
                TotalUsers = usersInBranch.Count,
                ActiveUsers = usersInBranch.Count(u => u.IsActive),
                InactiveUsers = usersInBranch.Count(u => !u.IsActive),
                RoleDistribution = usersInBranch.GroupBy(u => u.Role.RoleName)
                    .Select(g => new RoleDistribution { RoleName = g.Key, Count = g.Count() })
                    .ToList()
            };

            // 2. Event Stats
            var eventsInBranch = await _context.Events
                .Where(e => e.Organizer.CurrentBranchId == branchId)
                .ToListAsync();

            var eventStats = new EventAnalytics
            {
                TotalEvents = eventsInBranch.Count,
                UpcomingEvents = eventsInBranch.Count(e => e.ScheduledDate >= DateTime.Now && 
                    (e.Status == "confirmed" || e.Status == "voting" || e.Status == "inviting")),
                CompletedEvents = eventsInBranch.Count(e => e.Status == "completed"),
                CancelledEvents = eventsInBranch.Count(e => e.Status == "cancelled"),
                StatusDistribution = eventsInBranch.GroupBy(e => e.Status)
                    .Select(g => new StatusDistribution { Status = g.Key, Count = g.Count() })
                    .ToList(),
                TypeDistribution = eventsInBranch.GroupBy(e => e.EventType)
                    .Select(g => new TypeDistribution { Type = g.Key, Count = g.Count() })
                    .ToList()
            };

            // 3. Place Stats
            var placesInBranch = await _context.Places
                .Where(p => p.BranchId == branchId && !p.IsDeleted)
                .ToListAsync();

            var placeStats = new PlaceAnalytics
            {
                TotalPlaces = placesInBranch.Count,
                VerifiedPlaces = placesInBranch.Count(p => p.VerificationStatus == PlaceVerificationStatus.Approved),
                PendingPlaces = placesInBranch.Count(p => p.VerificationStatus == PlaceVerificationStatus.Pending),
                ReportedPlaces = await _context.PlaceReports.CountAsync(r => r.Place.BranchId == branchId && !r.IsResolved),
                TopRatedPlaces = placesInBranch.OrderByDescending(p => p.AverageRating)
                    .Take(5)
                    .Select(p => new TopPlaceDto 
                    { 
                        PlaceId = p.PlaceId, 
                        Name = p.Name, 
                        Rating = p.AverageRating,
                        TotalReviews = p.TotalReviews
                    })
                    .ToList()
            };

            // 4. Activity Trends (Last 6 months)
            var last6Months = Enumerable.Range(0, 6)
                .Select(i => DateTime.Today.AddMonths(-i))
                .OrderBy(d => d)
                .ToList();

            var activityTrends = new List<MonthlyTrend>();
            foreach (var monthDate in last6Months)
            {
                var monthLabel = monthDate.ToString("MMM yyyy");
                var startOfMonth = new DateTime(monthDate.Year, monthDate.Month, 1);
                var endOfMonth = startOfMonth.AddMonths(1);

                activityTrends.Add(new MonthlyTrend
                {
                    Month = monthLabel,
                    EventCount = eventsInBranch.Count(e => e.CreatedAt >= startOfMonth && e.CreatedAt < endOfMonth),
                    UserRegistrationCount = usersInBranch.Count(u => u.CreatedAt >= startOfMonth && u.CreatedAt < endOfMonth)
                });
            }

            return new ModeratorAnalyticsDto
            {
                UserStats = userStats,
                EventStats = eventStats,
                PlaceStats = placeStats,
                ActivityTrends = activityTrends
            };
        }
    }
}

