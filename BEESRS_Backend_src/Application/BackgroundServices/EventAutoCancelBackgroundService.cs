using Application.Interfaces;
using Infrastructure.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Application.BackgroundServices
{
    public class EventAutoCancelBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<EventAutoCancelBackgroundService> _logger;

        public EventAutoCancelBackgroundService(
            IServiceProvider serviceProvider, 
            ILogger<EventAutoCancelBackgroundService> logger)
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
                    var eventService = scope.ServiceProvider.GetRequiredService<IEventService>();

                    // Find events with expired RSVP deadline and only 1 participant
                    var eventsToCancel = await eventRepository.GetEventsWithExpiredRsvpAndInsufficientParticipantsAsync();

                    foreach (var eventEntity in eventsToCancel)
                    {
                        try
                        {
                            await eventService.CancelEventAsync(
                                eventEntity.EventId, 
                                "Event automatically cancelled because the invitation deadline passed and only one participant (the organizer) joined.");
                            
                            _logger.LogInformation(
                                "Event {EventId} automatically cancelled due to insufficient participants at: {time}", 
                                eventEntity.EventId, 
                                DateTimeOffset.UtcNow);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(
                                ex, 
                                "Error auto-cancelling event {EventId}", 
                                eventEntity.EventId);
                        }
                    }

                    if (eventsToCancel.Any())
                    {
                        _logger.LogInformation(
                            "Auto-cancelled {Count} events at: {time}", 
                            eventsToCancel.Count, 
                            DateTimeOffset.UtcNow);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during event auto-cancel check");
                }

                // Run every 30 minutes
                await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
            }
        }
    }
}

