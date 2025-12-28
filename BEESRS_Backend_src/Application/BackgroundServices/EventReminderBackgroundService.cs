using Application.Interfaces;
using Infrastructure.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Models.NotificationDTO;

namespace Application.BackgroundServices
{
    public class EventReminderBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<EventReminderBackgroundService> _logger;

        public EventReminderBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<EventReminderBackgroundService> logger)
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
                    var eventRepository = scope.ServiceProvider.GetRequiredService<IEventRepository>();
                    var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
                    var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
                    var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
                    var participantRepository = scope.ServiceProvider.GetRequiredService<IEventParticipantRepository>();

                    var now = DateTimeOffset.UtcNow;

                    // 1. Remind 24 hours before event
                    // Calculate target window: events that start between 24h and 25h from now
                    var target24hStart = now.AddHours(24);
                    var target24hEnd = now.AddHours(25);
                    var events24h = await eventRepository.GetUpcomingEventsAsync(
                        target24hStart,
                        target24hEnd,
                        new[] { "confirmed", "voting" });

                    foreach (var eventEntity in events24h)
                    {
                        // Check if event is actually within 24h window (combine date + time)
                        var eventDateTime = eventEntity.ScheduledDate.Date + eventEntity.ScheduledTime;
                        var eventDateTimeOffset = new DateTimeOffset(eventDateTime, TimeSpan.Zero);
                        
                        if (eventDateTimeOffset >= target24hStart && eventDateTimeOffset <= target24hEnd)
                        {
                            await SendReminderAsync(eventEntity, "24h", emailService, notificationService, userRepository, participantRepository);
                        }
                    }

                    // 2. Remind 1 hour before event
                    // Calculate target window: events that start between 1h and 1.5h from now (30 min window)
                    var target1hStart = now.AddHours(1);
                    var target1hEnd = now.AddHours(1.5);
                    var events1h = await eventRepository.GetUpcomingEventsAsync(
                        target1hStart,
                        target1hEnd,
                        new[] { "confirmed" });

                    foreach (var eventEntity in events1h)
                    {
                        // Check if event is actually within 1h window (combine date + time)
                        var eventDateTime = eventEntity.ScheduledDate.Date + eventEntity.ScheduledTime;
                        var eventDateTimeOffset = new DateTimeOffset(eventDateTime, TimeSpan.Zero);
                        
                        if (eventDateTimeOffset >= target1hStart && eventDateTimeOffset <= target1hEnd)
                        {
                            await SendReminderAsync(eventEntity, "1h", emailService, notificationService, userRepository, participantRepository);
                        }
                    }

                    // 3. Remind voting deadline (24h before deadline)
                    var votingEvents = await eventRepository.GetEventsWithVotingDeadlineAsync(
                        now.AddHours(24),
                        now.AddHours(25));

                    foreach (var eventEntity in votingEvents)
                    {
                        await SendVotingReminderAsync(eventEntity, emailService, notificationService, userRepository, participantRepository);
                    }

                    // 4. Remind RSVP deadline (24h before deadline)
                    var rsvpEvents = await eventRepository.GetEventsWithRsvpDeadlineAsync(
                        now.AddHours(24),
                        now.AddHours(25));

                    foreach (var eventEntity in rsvpEvents)
                    {
                        await SendRsvpReminderAsync(eventEntity, emailService, notificationService, userRepository, participantRepository);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during event reminder check");
                }

                // Run every hour
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }

        private async Task SendReminderAsync(
            Event eventEntity,
            string reminderType,
            IEmailService emailService,
            INotificationService notificationService,
            IUserRepository userRepository,
            IEventParticipantRepository participantRepository)
        {
            var participants = eventEntity.EventParticipants?
                .Where(ep => ep.InvitationStatus == "accepted")
                .ToList() ?? new System.Collections.Generic.List<EventParticipant>();

            foreach (var participant in participants)
            {
                // Check if already sent (for 24h reminder)
                if (reminderType == "24h" && participant.ReminderSentAt.HasValue)
                    continue;

                // Check if already sent (for 1h reminder)
                if (reminderType == "1h" && participant.OneHourReminderSentAt.HasValue)
                    continue;

                var user = await userRepository.GetByIdAsync(participant.UserId);
                if (user == null || string.IsNullOrEmpty(user.Email))
                    continue;

                try
                {
                    // Send email
                    await emailService.SendEventReminderEmailAsync(
                        user.Email,
                        eventEntity,
                        reminderType);

                    // Send notification
                    var timeText = reminderType == "24h" ? "in 24 hours" : "in 1 hour";
                    var notification = new GeneralNotificationMessage
                    {
                        Title = reminderType == "24h" ? "Event Reminder - 24 Hours" : "Event Reminder - 1 Hour",
                        Message = $"Event '{eventEntity.Title}' is starting {timeText}",
                        Type = NotificationMessageType.DataUpdated.ToString(),
                        SenderId = eventEntity.OrganizerId,
                        TargetUserId = participant.UserId
                    };

                    await notificationService.BoardcastToSpecificUserByIdAsync(notification);

                    // Update reminder sent timestamp
                    if (reminderType == "24h")
                    {
                        participant.ReminderSentAt = DateTimeOffset.UtcNow;
                        await participantRepository.UpdateAsync(participant);
                    }
                    else if (reminderType == "1h")
                    {
                        participant.OneHourReminderSentAt = DateTimeOffset.UtcNow;
                        await participantRepository.UpdateAsync(participant);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error sending reminder to user {participant.UserId}");
                }
            }
        }

        private async Task SendVotingReminderAsync(
            Event eventEntity,
            IEmailService emailService,
            INotificationService notificationService,
            IUserRepository userRepository,
            IEventParticipantRepository participantRepository)
        {
            var participants = eventEntity.EventParticipants?
                .Where(ep => ep.InvitationStatus == "accepted")
                .ToList() ?? new System.Collections.Generic.List<EventParticipant>();

            foreach (var participant in participants)
            {
                var user = await userRepository.GetByIdAsync(participant.UserId);
                if (user == null || string.IsNullOrEmpty(user.Email))
                    continue;

                try
                {
                    await emailService.SendVotingDeadlineReminderEmailAsync(
                        user.Email,
                        eventEntity);

                    var notification = new GeneralNotificationMessage
                    {
                        Title = "Voting Deadline Reminder",
                        Message = $"Voting deadline for event '{eventEntity.Title}' is approaching (24 hours remaining)",
                        Type = NotificationMessageType.DataUpdated.ToString(),
                        SenderId = eventEntity.OrganizerId,
                        TargetUserId = participant.UserId
                    };

                    await notificationService.BoardcastToSpecificUserByIdAsync(notification);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error sending voting reminder to user {participant.UserId}");
                }
            }
        }

        private async Task SendRsvpReminderAsync(
            Event eventEntity,
            IEmailService emailService,
            INotificationService notificationService,
            IUserRepository userRepository,
            IEventParticipantRepository participantRepository)
        {
            var participants = eventEntity.EventParticipants?
                .Where(ep => ep.InvitationStatus == "pending")
                .ToList() ?? new System.Collections.Generic.List<EventParticipant>();

            foreach (var participant in participants)
            {
                var user = await userRepository.GetByIdAsync(participant.UserId);
                if (user == null || string.IsNullOrEmpty(user.Email))
                    continue;

                try
                {
                    await emailService.SendRsvpDeadlineReminderEmailAsync(
                        user.Email,
                        eventEntity);

                    var notification = new GeneralNotificationMessage
                    {
                        Title = "RSVP Deadline Reminder",
                        Message = $"RSVP deadline for event '{eventEntity.Title}' is approaching (24 hours remaining)",
                        Type = NotificationMessageType.DataUpdated.ToString(),
                        SenderId = eventEntity.OrganizerId,
                        TargetUserId = participant.UserId
                    };

                    await notificationService.BoardcastToSpecificUserByIdAsync(notification);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error sending RSVP reminder to user {participant.UserId}");
                }
            }
        }
    }
}

