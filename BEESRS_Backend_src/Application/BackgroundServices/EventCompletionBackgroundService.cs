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
    public class EventCompletionBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<EventCompletionBackgroundService> _logger;

        public EventCompletionBackgroundService(
            IServiceProvider serviceProvider, 
            ILogger<EventCompletionBackgroundService> logger)
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
                    var stateMachine = scope.ServiceProvider.GetRequiredService<IEventStateMachine>();

                    // Get events that should be completed
                    var eventsToComplete = await eventRepository.GetEventsToCompleteAsync();

                    foreach (var eventEntity in eventsToComplete)
                    {
                        try
                        {
                            await stateMachine.TransitionToAsync(eventEntity, "completed");
                            _logger.LogInformation(
                                "Event {EventId} transitioned to completed at: {time}", 
                                eventEntity.EventId, 
                                DateTimeOffset.UtcNow);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(
                                ex, 
                                "Error completing event {EventId}", 
                                eventEntity.EventId);
                        }
                    }

                    if (eventsToComplete.Any())
                    {
                        _logger.LogInformation(
                            "Completed {Count} events at: {time}", 
                            eventsToComplete.Count, 
                            DateTimeOffset.UtcNow);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during event completion check");
                }

                // Run every 6 hours
                await Task.Delay(TimeSpan.FromHours(6), stoppingToken);
            }
        }
    }
}



















































































