using System;
using System.Collections.Generic;
using System.Linq;
using Application.Exceptions;
using Domain.Entities;

namespace Application.Services
{
    public static class EventBusinessRules
    {
        // BR_EVENT_01: Minimum Advance Scheduling
        public static void ValidateMinimumAdvanceScheduling(Event eventEntity)
        {
            if (eventEntity.ScheduledDate <= DateTime.Now.AddDays(3))
            {
                throw new BusinessRuleException(
                    "Event must be scheduled at least 3 days in advance to allow for proper planning and invitations.",
                    "BR_EVENT_01"
                );
            }
        }

        // BR_EVENT_02: Minimum Participants
        public static void ValidateMinimumParticipants(Event eventEntity)
        {
            if (eventEntity.ExpectedAttendees < 2)
            {
                throw new BusinessRuleException(
                    "Event requires at least 2 participants. Use personal itinerary for solo activities.",
                    "BR_EVENT_02"
                );
            }
        }

        // BR_EVENT_03: Budget Validation
        public static void ValidateBudget(Event eventEntity)
        {
            if (eventEntity.BudgetTotal.HasValue)
            {
                // Minimum $5 USD per person
                decimal minBudgetPerPerson = 5m;
                decimal requiredBudget = eventEntity.ExpectedAttendees * minBudgetPerPerson;

                if (eventEntity.BudgetTotal < requiredBudget)
                {
                    throw new BusinessRuleException(
                        $"Budget too low. Minimum {minBudgetPerPerson:N2} USD per person required.",
                        "BR_EVENT_03"
                    );
                }
            }
        }

        // BR_EVENT_04: Acceptance Threshold
        public static bool CheckAcceptanceThreshold(int acceptedCount, int expectedAttendees, decimal? customThreshold = null)
        {
            // Use custom threshold if provided, otherwise default to 70%
            double threshold = (double)(customThreshold ?? 0.7m);
            return acceptedCount >= (expectedAttendees * threshold);
        }

        // BR_EVENT_05: Auto-Cancel on Insufficient Participants
        public static bool ShouldAutoCancel(
            Event eventEntity, 
            int acceptedCount, 
            DateTime invitationDeadline)
        {
            int minRequired = Math.Max(2, (int)(eventEntity.ExpectedAttendees * 0.5)); // Min 50%

            return DateTime.Now > invitationDeadline && acceptedCount < minRequired;
        }

        // BR_EVENT_06: Voting Deadline Auto-Finalize
        public static bool ShouldAutoFinalize(Event eventEntity)
        {
            return eventEntity.VotingDeadline.HasValue 
                && DateTime.Now >= eventEntity.VotingDeadline.Value;
        }

        // BR_EVENT_07: No Time Overlap Validation
        public static void ValidateNoTimeOverlap(List<Event> overlappingEvents, Event newEvent)
        {
            if (overlappingEvents != null && overlappingEvents.Any())
            {
                var overlappingEvent = overlappingEvents.First();
                var newEventDuration = newEvent.EstimatedDuration ?? 120;
                var existingDuration = overlappingEvent.EstimatedDuration ?? 120;
                
                var newEventStart = newEvent.ScheduledTime;
                var newEventEnd = newEventStart.Add(TimeSpan.FromMinutes(newEventDuration));
                var existingStart = overlappingEvent.ScheduledTime;
                var existingEnd = existingStart.Add(TimeSpan.FromMinutes(existingDuration));

                throw new BusinessRuleException(
                    $"Cannot create event because it overlaps with existing event '{overlappingEvent.Title}' " +
                    $"(Time: {existingStart:hh\\:mm} - {existingEnd:hh\\:mm}). " +
                    $"Please choose a different time or cancel the existing event first.",
                    "BR_EVENT_07"
                );
            }
        }
        // BR_EVENT_08: Invitation Deadline Validation
        public static void ValidateInvitationDeadline(Event eventEntity)
        {
            if (eventEntity.RsvpDeadline.HasValue && DateTimeOffset.Now > eventEntity.RsvpDeadline.Value)
            {
                throw new BusinessRuleException(
                    "The invitation deadline for this event has passed.",
                    "BR_EVENT_08"
                );
            }
        }

        // BR_EVENT_09: Valid Status for Invitations
        public static void ValidateStatusForInvitations(string status)
        {
            var allowedStatuses = new[] { "draft", "planning", "inviting", "gathering_preferences" };
            if (!allowedStatuses.Contains(status.ToLower()))
            {
                throw new BusinessRuleException(
                    $"Cannot send invitations when event is in {status} status.",
                    "BR_EVENT_09"
                );
            }
        }
    }
}
















