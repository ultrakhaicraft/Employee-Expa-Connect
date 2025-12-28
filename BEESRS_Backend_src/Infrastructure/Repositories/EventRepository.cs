using Domain.Entities;
using Infrastructure.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Infrastructure.Repositories
{
    public class EventRepository : IEventRepository
    {
        private readonly BEESRSDBContext _context;

        public EventRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<Event?> GetByIdAsync(Guid eventId)
        {
            return await _context.Events
                .FirstOrDefaultAsync(e => e.EventId == eventId);
        }

        public async Task<Event?> GetByIdWithDetailsAsync(Guid eventId)
        {
            return await _context.Events
                .Include(e => e.Organizer)
                    .ThenInclude(o => o.UserProfile)
                .Include(e => e.EventParticipants)
                    .ThenInclude(ep => ep.User)
                        .ThenInclude(u => u.UserProfile)
                .Include(e => e.EventPlaceOptions)
                    .ThenInclude(epo => epo.Place)
                        .ThenInclude(p => p.PlaceCategory)
                .Include(e => e.EventPlaceOptions)
                    .ThenInclude(epo => epo.Place)
                        .ThenInclude(p => p.PlaceImages)
                .Include(e => e.EventVotes)
                .Include(e => e.FinalPlace)
                .FirstOrDefaultAsync(e => e.EventId == eventId);
        }

        public async Task<List<Event>> GetByOrganizerAsync(Guid organizerId)
        {
            return await _context.Events
                .Where(e => e.OrganizerId == organizerId)
                .Include(e => e.EventParticipants)
                    .ThenInclude(ep => ep.User)
                        .ThenInclude(u => u.UserProfile)
                .OrderByDescending(e => e.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<Event>> GetByParticipantAsync(Guid userId)
        {
            return await _context.Events
                .Where(e => e.EventParticipants.Any(ep => ep.UserId == userId))
                .Include(e => e.Organizer)
                    .ThenInclude(o => o.UserProfile)
                .Include(e => e.EventParticipants)
                    .ThenInclude(ep => ep.User)
                        .ThenInclude(u => u.UserProfile)
                .OrderByDescending(e => e.ScheduledDate)
                .ToListAsync();
        }

        public async Task<Event> CreateAsync(Event eventEntity)
        {
            _context.Events.Add(eventEntity);
            await _context.SaveChangesAsync();
            return eventEntity;
        }

        public async Task UpdateAsync(Event eventEntity)
        {
            eventEntity.UpdatedAt = DateTimeOffset.Now;
            _context.Events.Update(eventEntity);
            await _context.SaveChangesAsync();
        }

        public async Task<int> GetAcceptedParticipantsCountAsync(Guid eventId)
        {
            return await _context.EventParticipants
                .CountAsync(ep => ep.EventId == eventId && ep.InvitationStatus == "accepted");
        }

        public async Task<List<Event>> GetEventsToCompleteAsync()
        {
            return await _context.Events
                .Where(e => e.Status == "confirmed" 
                    && e.ScheduledDate < DateTime.Now.AddDays(-1))
                .ToListAsync();
        }

        public async Task<List<Event>> GetUpcomingEventsAsync(DateTimeOffset startTime, DateTimeOffset endTime, string[] statuses)
        {
            // Convert DateTimeOffset to DateTime for comparison (using UTC)
            var startDate = startTime.UtcDateTime.Date;
            var endDate = endTime.UtcDateTime.Date;
            
            return await _context.Events
                .Include(e => e.EventParticipants)
                    .ThenInclude(ep => ep.User)
                .Where(e => statuses.Contains(e.Status) &&
                           e.ScheduledDate.Date >= startDate &&
                           e.ScheduledDate.Date <= endDate)
                .ToListAsync();
        }

        public async Task<List<Event>> GetEventsWithVotingDeadlineAsync(DateTimeOffset startTime, DateTimeOffset endTime)
        {
            return await _context.Events
                .Include(e => e.EventParticipants)
                    .ThenInclude(ep => ep.User)
                .Where(e => e.Status == "voting" &&
                           e.VotingDeadline.HasValue &&
                           e.VotingDeadline.Value >= startTime &&
                           e.VotingDeadline.Value <= endTime)
                .ToListAsync();
        }

        public async Task<List<Event>> GetEventsWithRsvpDeadlineAsync(DateTimeOffset startTime, DateTimeOffset endTime)
        {
            return await _context.Events
                .Include(e => e.EventParticipants)
                    .ThenInclude(ep => ep.User)
                .Where(e => (e.Status == "inviting" || e.Status == "gathering_preferences") &&
                           e.RsvpDeadline.HasValue &&
                           e.RsvpDeadline.Value >= startTime &&
                           e.RsvpDeadline.Value <= endTime)
                .ToListAsync();
        }

        public async Task<List<Event>> GetEventsByBranchIdAsync(Guid branchId)
        {
            // First, get all events with necessary includes
            var allEvents = await _context.Events
                .Include(e => e.Organizer)
                .Include(e => e.FinalPlace)
                .Include(e => e.EventPlaceOptions)
                    .ThenInclude(epo => epo.Place)
                .Include(e => e.EventParticipants)
                .ToListAsync();

            System.Diagnostics.Debug.WriteLine($"Total events in database: {allEvents.Count}");
            System.Diagnostics.Debug.WriteLine($"Filtering by branch: {branchId}");

            // Filter in memory to handle nullable navigation properties correctly
            var filteredEvents = allEvents.Where(e =>
            {
                // Events where organizer's branch matches
                var organizerBranchMatch = e.Organizer != null && 
                    (e.Organizer.CurrentBranchId == branchId);
                
                // Events where final place's branch matches
                var finalPlaceBranchMatch = e.FinalPlace != null && e.FinalPlace.BranchId == branchId;
                
                // Events where any place option's branch matches
                var placeOptionBranchMatch = e.EventPlaceOptions != null && 
                    e.EventPlaceOptions.Any(epo => epo.Place != null && epo.Place.BranchId == branchId);
                
                var matches = organizerBranchMatch || finalPlaceBranchMatch || placeOptionBranchMatch;
                
                if (!matches && e.Organizer != null)
                {
                    System.Diagnostics.Debug.WriteLine($"Event {e.EventId} ({e.Title}) - Organizer CurrentBranchId: {e.Organizer.CurrentBranchId}, FinalPlace BranchId: {e.FinalPlace?.BranchId}");
                }
                
                return matches;
            })
            .OrderByDescending(e => e.CreatedAt)
            .ToList();

            System.Diagnostics.Debug.WriteLine($"Filtered events count: {filteredEvents.Count}");

            return filteredEvents;
        }

        public async Task<Event?> GetByIdWithFullStatisticsAsync(Guid eventId)
        {
            return await _context.Events
                .Include(e => e.Organizer)
                    .ThenInclude(o => o.CurrentBranch)
                .Include(e => e.Organizer)
                    .ThenInclude(o => o.UserProfile)
                .Include(e => e.EventParticipants)
                    .ThenInclude(ep => ep.User)
                        .ThenInclude(u => u.UserProfile)
                .Include(e => e.EventPlaceOptions)
                    .ThenInclude(epo => epo.Place)
                        .ThenInclude(p => p.PlaceCategory)
                .Include(e => e.EventVotes)
                    .ThenInclude(ev => ev.Voter)
                .Include(e => e.FinalPlace)
                .Include(e => e.EventCheckIns)
                    .ThenInclude(ec => ec.User)
                .Include(e => e.EventFeedbacks)
                    .ThenInclude(ef => ef.User)
                .Include(e => e.EventWaitlists)
                .FirstOrDefaultAsync(e => e.EventId == eventId);
        }

        public async Task AddEventImageAsync(Guid eventId, string imageUrl)
        {
            var eventEntity = await _context.Events.FindAsync(eventId);
            if (eventEntity != null)
            {
                eventEntity.EventImageUrl = imageUrl;
                eventEntity.UpdatedAt = DateTimeOffset.Now;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<List<Event>> GetOverlappingEventsAsync(Guid organizerId, DateTime scheduledDate, TimeSpan scheduledTime, int? estimatedDuration, Guid? excludeEventId = null)
        {
            // Get all events for the organizer on the same date, excluding cancelled and completed events
            var eventsOnSameDate = await _context.Events
                .Where(e => e.OrganizerId == organizerId &&
                           e.ScheduledDate.Date == scheduledDate.Date &&
                           e.Status != "cancelled" &&
                           e.Status != "completed" &&
                           (excludeEventId == null || e.EventId != excludeEventId.Value))
                .ToListAsync();

            // Default duration is 2 hours if not specified
            var duration = estimatedDuration ?? 120; // minutes
            var newEventStart = scheduledTime;
            var newEventEnd = scheduledTime.Add(TimeSpan.FromMinutes(duration));

            var overlappingEvents = new List<Event>();

            foreach (var existingEvent in eventsOnSameDate)
            {
                var existingDuration = existingEvent.EstimatedDuration ?? 120; // Default 2 hours
                var existingStart = existingEvent.ScheduledTime;
                var existingEnd = existingEvent.ScheduledTime.Add(TimeSpan.FromMinutes(existingDuration));

                // Check for overlap: (StartA < EndB) && (EndA > StartB)
                if (newEventStart < existingEnd && newEventEnd > existingStart)
                {
                    overlappingEvents.Add(existingEvent);
                }
            }

            return overlappingEvents;
        }

        public async Task<List<Event>> GetEventsByBranchWithPrivacyAsync(
            Guid branchId, 
            Guid userId, 
            string? timeFilter = null,
            string? statusFilter = null,
            int page = 1,
            int pageSize = 20)
        {
            var allEvents = await _context.Events
                .Include(e => e.Organizer)
                    .ThenInclude(o => o.UserProfile)
                .Include(e => e.FinalPlace)
                .Include(e => e.EventPlaceOptions)
                    .ThenInclude(epo => epo.Place)
                .Include(e => e.EventParticipants)
                    .ThenInclude(ep => ep.User)
                        .ThenInclude(u => u.UserProfile)
                .ToListAsync();

            var now = DateTime.UtcNow;
            
            // Bước 1: Xác định branch của event
            var branchEvents = allEvents.Where(e =>
            {
                // Xác định branch từ FinalPlace (ưu tiên) hoặc Organizer
                // Nếu event đã chốt địa điểm, dùng branch của địa điểm
                // Nếu chưa chốt, dùng branch của Organizer
                Guid? eventBranchId = null;
                
                if (e.FinalPlaceId.HasValue && e.FinalPlace != null)
                {
                    // Event đã chốt địa điểm - dùng branch của địa điểm
                    eventBranchId = e.FinalPlace.BranchId;
                }
                else if (e.Organizer != null)
                {
                    // Event chưa chốt địa điểm - dùng branch của Organizer
                    eventBranchId = e.Organizer.CurrentBranchId;
                }
                
                // Chỉ lấy events có branchId hợp lệ và khớp với branchId được yêu cầu
                return eventBranchId.HasValue && eventBranchId.Value == branchId && eventBranchId.Value != Guid.Empty;
            });

            // Bước 2: Loại bỏ events của chính user (chỉ hiển thị events của người khác)
            var otherUsersEvents = branchEvents.Where(e => e.OrganizerId != userId);

            // Bước 3: Filter theo Status - Loại bỏ draft và cancelled
            var statusFilteredEvents = otherUsersEvents.Where(e =>
            {
                // Events ở trạng thái draft hoặc cancelled không hiển thị
                if (e.Status == "draft" || e.Status == "cancelled")
                    return false;
                
                return true;
            });

            // Bước 4: Áp dụng Privacy Filter
            var privacyFilteredEvents = statusFilteredEvents.Where(e =>
            {
                // Xử lý Privacy: mặc định là "Public" nếu null hoặc empty
                var privacy = string.IsNullOrWhiteSpace(e.Privacy) ? "Public" : e.Privacy;
                
                // Public events: hiển thị cho tất cả user trong branch
                if (privacy.Equals("Public", StringComparison.OrdinalIgnoreCase))
                    return true;
                
                // Private events: chỉ hiển thị cho người trong GuestList (đã loại bỏ organizer ở bước 2)
                if (privacy.Equals("Private", StringComparison.OrdinalIgnoreCase))
                {
                    // Kiểm tra xem user có trong danh sách participants không
                    // Chỉ tính những người đã accepted hoặc pending (không tính declined)
                    var isParticipant = e.EventParticipants?
                        .Any(ep => ep.UserId == userId && 
                                  (ep.InvitationStatus == "accepted" || 
                                   ep.InvitationStatus == "pending")) ?? false;
                    
                    return isParticipant;
                }
                
                // Nếu Privacy không phải Public hoặc Private, mặc định không hiển thị (an toàn)
                return false;
            });

            // Bước 5: Áp dụng Time Filter (Upcoming/Past)
            // Lưu ý: ScheduledDate và ScheduledTime đã được lưu ở UTC trong database
            if (!string.IsNullOrEmpty(timeFilter))
            {
                var timeFilterLower = timeFilter.ToLower();
                if (timeFilterLower == "upcoming")
                {
                    privacyFilteredEvents = privacyFilteredEvents.Where(e =>
                    {
                        // ScheduledDate và ScheduledTime đã là UTC, so sánh trực tiếp với DateTime.UtcNow
                        var eventDateTime = e.ScheduledDate.Date.Add(e.ScheduledTime);
                        return eventDateTime >= now;
                    });
                }
                else if (timeFilterLower == "past")
                {
                    privacyFilteredEvents = privacyFilteredEvents.Where(e =>
                    {
                        // ScheduledDate và ScheduledTime đã là UTC, so sánh trực tiếp với DateTime.UtcNow
                        var eventDateTime = e.ScheduledDate.Date.Add(e.ScheduledTime);
                        return eventDateTime < now;
                    });
                }
            }

            // Bước 6: Áp dụng Status Filter (user-selected filter)
            if (!string.IsNullOrEmpty(statusFilter))
            {
                privacyFilteredEvents = privacyFilteredEvents
                    .Where(e => e.Status.ToLower() == statusFilter.ToLower());
            }

            // Bước 7: Sắp xếp và phân trang
            var orderedEvents = privacyFilteredEvents
                .OrderByDescending(e => e.ScheduledDate)
                .ThenByDescending(e => e.ScheduledTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return orderedEvents;
        }

        public async Task<int> GetEventsByBranchWithPrivacyCountAsync(
            Guid branchId, 
            Guid userId, 
            string? timeFilter = null,
            string? statusFilter = null)
        {
            var allEvents = await _context.Events
                .Include(e => e.Organizer)
                    .ThenInclude(o => o.UserProfile)
                .Include(e => e.FinalPlace)
                .Include(e => e.EventPlaceOptions)
                    .ThenInclude(epo => epo.Place)
                .Include(e => e.EventParticipants)
                    .ThenInclude(ep => ep.User)
                        .ThenInclude(u => u.UserProfile)
                .ToListAsync();

            var now = DateTime.UtcNow;
            
            // Bước 1: Xác định branch của event
            var branchEvents = allEvents.Where(e =>
            {
                // Xác định branch từ FinalPlace (ưu tiên) hoặc Organizer
                Guid? eventBranchId = null;
                
                if (e.FinalPlaceId.HasValue && e.FinalPlace != null)
                {
                    // Event đã chốt địa điểm - dùng branch của địa điểm
                    eventBranchId = e.FinalPlace.BranchId;
                }
                else if (e.Organizer != null)
                {
                    // Event chưa chốt địa điểm - dùng branch của Organizer
                    eventBranchId = e.Organizer.CurrentBranchId;
                }
                
                // Chỉ lấy events có branchId hợp lệ và khớp với branchId được yêu cầu
                return eventBranchId.HasValue && eventBranchId.Value == branchId && eventBranchId.Value != Guid.Empty;
            });

            // Bước 2: Loại bỏ events của chính user (chỉ hiển thị events của người khác)
            var otherUsersEvents = branchEvents.Where(e => e.OrganizerId != userId);

            // Bước 3: Filter theo Status - Loại bỏ draft và cancelled
            var statusFilteredEvents = otherUsersEvents.Where(e =>
            {
                // Events ở trạng thái draft hoặc cancelled không hiển thị
                if (e.Status == "draft" || e.Status == "cancelled")
                    return false;
                
                return true;
            });

            // Bước 4: Áp dụng Privacy Filter
            var privacyFilteredEvents = statusFilteredEvents.Where(e =>
            {
                // Xử lý Privacy: mặc định là "Public" nếu null hoặc empty
                var privacy = string.IsNullOrWhiteSpace(e.Privacy) ? "Public" : e.Privacy;
                
                // Public events: hiển thị cho tất cả user trong branch
                if (privacy.Equals("Public", StringComparison.OrdinalIgnoreCase))
                    return true;
                
                // Private events: chỉ hiển thị cho người trong GuestList (đã loại bỏ organizer ở bước 2)
                if (privacy.Equals("Private", StringComparison.OrdinalIgnoreCase))
                {
                    // Kiểm tra xem user có trong danh sách participants không
                    var isParticipant = e.EventParticipants?
                        .Any(ep => ep.UserId == userId && 
                                  (ep.InvitationStatus == "accepted" || 
                                   ep.InvitationStatus == "pending")) ?? false;
                    
                    return isParticipant;
                }
                
                // Nếu Privacy không phải Public hoặc Private, mặc định không hiển thị (an toàn)
                return false;
            });

            // Bước 5: Áp dụng Time Filter
            if (!string.IsNullOrEmpty(timeFilter))
            {
                var timeFilterLower = timeFilter.ToLower();
                if (timeFilterLower == "upcoming")
                {
                    privacyFilteredEvents = privacyFilteredEvents.Where(e =>
                    {
                        var eventDateTime = e.ScheduledDate.Date.Add(e.ScheduledTime);
                        return eventDateTime >= now;
                    });
                }
                else if (timeFilterLower == "past")
                {
                    privacyFilteredEvents = privacyFilteredEvents.Where(e =>
                    {
                        var eventDateTime = e.ScheduledDate.Date.Add(e.ScheduledTime);
                        return eventDateTime < now;
                    });
                }
            }

            // Bước 6: Áp dụng Status Filter (user-selected filter)
            if (!string.IsNullOrEmpty(statusFilter))
            {
                privacyFilteredEvents = privacyFilteredEvents
                    .Where(e => e.Status.ToLower() == statusFilter.ToLower());
            }

            return privacyFilteredEvents.Count();
        }

        public async Task<List<Event>> GetEventsWithExpiredRsvpAndInsufficientParticipantsAsync()
        {
            return await _context.Events
                .Include(e => e.EventParticipants)
                .Where(e => (e.Status == "inviting" || e.Status == "gathering_preferences" || e.Status == "planning") &&
                           e.RsvpDeadline.HasValue &&
                           e.RsvpDeadline.Value <= DateTimeOffset.Now &&
                           e.EventParticipants.Count(ep => ep.InvitationStatus == "accepted") < 2)
                .ToListAsync();
        }
    }
}















