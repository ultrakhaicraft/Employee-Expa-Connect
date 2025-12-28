using Application.Interfaces;
using Infrastructure.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Domain.Entities;

namespace Application.BackgroundServices
{
    public class RecurringEventGenerationService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<RecurringEventGenerationService> _logger;

        public RecurringEventGenerationService(
            IServiceProvider serviceProvider,
            ILogger<RecurringEventGenerationService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var recurringEventRepository = scope.ServiceProvider.GetRequiredService<IRecurringEventRepository>();
                    var eventService = scope.ServiceProvider.GetRequiredService<IEventService>();
                    var eventRepository = scope.ServiceProvider.GetRequiredService<IEventRepository>();
                    var participantRepository = scope.ServiceProvider.GetRequiredService<IEventParticipantRepository>();

                    var activeRecurringEvents = await recurringEventRepository.GetActiveRecurringEventsAsync();
                    var now = DateTime.Now;

                    foreach (var recurringEvent in activeRecurringEvents)
                    {
                        try
                        {
                            // Check if we need to generate events
                            var daysInAdvance = recurringEvent.DaysInAdvance;
                            var targetDate = now.AddDays(daysInAdvance);

                            // Get existing generated events for this recurring event
                            var existingEvents = await eventRepository.GetByOrganizerAsync(recurringEvent.OrganizerId);
                            var generatedEvents = existingEvents
                                .Where(e => e.RecurringEventId == recurringEvent.RecurringEventId)
                                .ToList();

                            // Generate events based on recurrence pattern
                            var eventsToGenerate = CalculateNextOccurrences(recurringEvent, targetDate, generatedEvents);

                            foreach (var occurrenceDate in eventsToGenerate)
                            {
                                // Check if event already exists for this date
                                var existingEvent = generatedEvents.FirstOrDefault(e => 
                                    e.ScheduledDate.Date == occurrenceDate.Date &&
                                    e.ScheduledTime == recurringEvent.ScheduledTime);

                                if (existingEvent == null)
                                {
                                    // Create new event
                                    var newEvent = new Event
                                    {
                                        OrganizerId = recurringEvent.OrganizerId,
                                        Title = recurringEvent.Title,
                                        Description = recurringEvent.Description,
                                        EventType = recurringEvent.EventType,
                                        ScheduledDate = occurrenceDate,
                                        ScheduledTime = recurringEvent.ScheduledTime,
                                        EstimatedDuration = recurringEvent.EstimatedDuration,
                                        ExpectedAttendees = recurringEvent.ExpectedAttendees,
                                        BudgetPerPerson = recurringEvent.BudgetPerPerson,
                                        Status = "draft",
                                        RecurringEventId = recurringEvent.RecurringEventId,
                                        CreatedAt = DateTimeOffset.UtcNow,
                                        UpdatedAt = DateTimeOffset.UtcNow
                                    };

                                    await eventRepository.CreateAsync(newEvent);

                                    // Automatically add organizer as a participant with "accepted" status
                                    var organizerParticipant = new EventParticipant
                                    {
                                        EventId = newEvent.EventId,
                                        UserId = recurringEvent.OrganizerId,
                                        InvitationStatus = "accepted", // Organizer is automatically accepted
                                        InvitedAt = DateTimeOffset.UtcNow,
                                        InvitedBy = recurringEvent.OrganizerId, // Organizer invites themselves
                                        RsvpDate = DateTimeOffset.UtcNow, // Auto-accept
                                        AdditionalNotes = string.Empty
                                    };

                                    await participantRepository.CreateAsync(organizerParticipant);

                                    _logger.LogInformation(
                                        "Generated event {EventId} from recurring event {RecurringEventId} for date {Date}",
                                        newEvent.EventId,
                                        recurringEvent.RecurringEventId,
                                        occurrenceDate);
                                }
                            }

                            // Update last generated timestamp
                            recurringEvent.LastGeneratedAt = DateTimeOffset.UtcNow;
                            await recurringEventRepository.UpdateAsync(recurringEvent);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error generating events for recurring event {RecurringEventId}", recurringEvent.RecurringEventId);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during recurring event generation");
                }

                // Run daily
                await Task.Delay(TimeSpan.FromDays(1), stoppingToken);
            }
        }

        private System.Collections.Generic.List<DateTime> CalculateNextOccurrences(
            RecurringEvent recurringEvent,
            DateTime targetDate,
            System.Collections.Generic.List<Event> existingEvents)
        {
            var occurrences = new System.Collections.Generic.List<DateTime>();
            var startDate = recurringEvent.StartDate;
            var endDate = recurringEvent.EndDate ?? DateTime.MaxValue;
            var currentDate = startDate;

            // Limit to next 30 days or until target date
            var maxDate = targetDate.AddDays(30);

            while (currentDate <= maxDate && currentDate <= endDate)
            {
                if (ShouldGenerateForDate(recurringEvent, currentDate))
                {
                    // Check if not already generated
                    var exists = existingEvents.Any(e => e.ScheduledDate.Date == currentDate.Date);
                    if (!exists && currentDate >= DateTime.Now.Date)
                    {
                        occurrences.Add(currentDate);
                    }
                }

                currentDate = GetNextDate(recurringEvent, currentDate);
            }

            return occurrences;
        }

        private bool ShouldGenerateForDate(RecurringEvent recurringEvent, DateTime date)
        {
            switch (recurringEvent.RecurrencePattern.ToLower())
            {
                case "daily":
                    return true;

                case "weekly":
                    if (string.IsNullOrEmpty(recurringEvent.DaysOfWeek))
                        return date.DayOfWeek == recurringEvent.StartDate.DayOfWeek;
                    
                    try
                    {
                        // Try to deserialize as JSON array
                        var daysOfWeek = JsonSerializer.Deserialize<string[]>(recurringEvent.DaysOfWeek);
                        if (daysOfWeek != null && daysOfWeek.Length > 0)
                        {
                            var dayName = date.DayOfWeek.ToString();
                            return daysOfWeek.Contains(dayName);
                        }
                    }
                    catch (JsonException)
                    {
                        // If JSON deserialization fails, fall back to default behavior
                        _logger.LogWarning(
                            "Invalid DaysOfWeek JSON for recurring event {RecurringEventId}: {DaysOfWeek}. Falling back to start date day of week.",
                            recurringEvent.RecurringEventId,
                            recurringEvent.DaysOfWeek);
                    }
                    
                    // Fallback: use the day of week from start date
                    return date.DayOfWeek == recurringEvent.StartDate.DayOfWeek;

                case "monthly":
                    if (recurringEvent.DayOfMonth.HasValue)
                        return date.Day == recurringEvent.DayOfMonth.Value;
                    else
                        // Last day of month
                        return date.Day == DateTime.DaysInMonth(date.Year, date.Month);

                case "yearly":
                    return date.Month == (recurringEvent.Month ?? recurringEvent.StartDate.Month) &&
                           date.Day == (recurringEvent.DayOfYear ?? recurringEvent.StartDate.Day);

                default:
                    return false;
            }
        }

        private DateTime GetNextDate(RecurringEvent recurringEvent, DateTime currentDate)
        {
            switch (recurringEvent.RecurrencePattern.ToLower())
            {
                case "daily":
                    return currentDate.AddDays(1);

                case "weekly":
                    return currentDate.AddDays(7);

                case "monthly":
                    return currentDate.AddMonths(1);

                case "yearly":
                    return currentDate.AddYears(1);

                default:
                    return currentDate.AddDays(1);
            }
        }
    }
}

