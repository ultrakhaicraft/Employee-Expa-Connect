using Application.Interfaces;
using Infrastructure.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Persistence;

namespace Application.BackgroundServices
{
    public class EventAutoFinalizeBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<EventAutoFinalizeBackgroundService> _logger;

        public EventAutoFinalizeBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<EventAutoFinalizeBackgroundService> logger)
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
                    var context = scope.ServiceProvider.GetRequiredService<BEESRSDBContext>();
                    var eventService = scope.ServiceProvider.GetRequiredService<IEventService>();
                    var voteService = scope.ServiceProvider.GetRequiredService<IVoteService>();

                    // Find events in voting state with expired deadline
                    var eventsToFinalize = await context.Events
                        .Where(e => e.Status == "voting" 
                            && e.VotingDeadline.HasValue 
                            && e.VotingDeadline.Value <= DateTimeOffset.Now)
                        .ToListAsync(stoppingToken);

                    foreach (var eventEntity in eventsToFinalize)
                    {
                        try
                        {
                            // Calculate winning venue
                            var winningPlaceId = await voteService.CalculateWinningVenueAsync(eventEntity.EventId);

                            if (winningPlaceId != Guid.Empty)
                            {
                                // Get the option with this place ID
                                var option = await context.EventPlaceOptions
                                    .FirstOrDefaultAsync(epo => epo.EventId == eventEntity.EventId 
                                        && epo.PlaceId == winningPlaceId, stoppingToken);

                                if (option != null)
                                {
                                    await eventService.FinalizeEventAsync(
                                        eventEntity.EventId, 
                                        option.OptionId, 
                                        eventEntity.OrganizerId);

                                    _logger.LogInformation(
                                        "Event {EventId} auto-finalized with venue {VenueId} at: {time}",
                                        eventEntity.EventId,
                                        winningPlaceId,
                                        DateTimeOffset.UtcNow);
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(
                                ex,
                                "Error auto-finalizing event {EventId}",
                                eventEntity.EventId);
                        }
                    }

                    if (eventsToFinalize.Any())
                    {
                        _logger.LogInformation(
                            "Auto-finalized {Count} events at: {time}",
                            eventsToFinalize.Count,
                            DateTimeOffset.UtcNow);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during event auto-finalize check");
                }

                // Run every hour
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }
    }
}



















































































