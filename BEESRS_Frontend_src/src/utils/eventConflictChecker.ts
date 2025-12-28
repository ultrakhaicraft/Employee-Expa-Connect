import type { EventResponse } from '../types/event.types';

/**
 * Check if two events overlap in time
 */
export const checkEventsOverlap = (
  event1Date: string,
  event1Time: string,
  event1Duration: number | undefined,
  event2Date: string,
  event2Time: string,
  event2Duration: number | undefined
): boolean => {
  // Parse dates and times
  const date1 = new Date(`${event1Date}T${event1Time}`);
  const date2 = new Date(`${event2Date}T${event2Time}`);

  // If different dates, no overlap
  if (event1Date !== event2Date) {
    return false;
  }

  // Calculate end times (default duration: 2 hours if not specified)
  const duration1 = (event1Duration || 120) * 60 * 1000; // Convert minutes to milliseconds
  const duration2 = (event2Duration || 120) * 60 * 1000;
  
  const end1 = new Date(date1.getTime() + duration1);
  const end2 = new Date(date2.getTime() + duration2);

  // Check for overlap: event1 starts before event2 ends AND event1 ends after event2 starts
  return date1 < end2 && end1 > date2;
};

/**
 * Check if a new event conflicts with existing participating events
 */
export const checkConflictWithParticipatingEvents = (
  scheduledDate: string,
  scheduledTime: string,
  estimatedDuration: number | undefined,
  participatingEvents: EventResponse[]
): { hasConflict: boolean; conflictingEvents: EventResponse[] } => {
  const conflictingEvents = participatingEvents.filter(event => {
    // Only check events that are not cancelled or draft
    if (event.status === 'cancelled' || event.status === 'draft') {
      return false;
    }

    // Only check accepted or pending invitations
    // Note: This assumes the event has invitationStatus field, adjust if needed
    return checkEventsOverlap(
      scheduledDate,
      scheduledTime,
      estimatedDuration,
      event.scheduledDate,
      event.scheduledTime,
      event.estimatedDuration
    );
  });

  return {
    hasConflict: conflictingEvents.length > 0,
    conflictingEvents
  };
};

/**
 * Format conflicting events for display
 */
export const formatConflictingEvents = (events: EventResponse[]): string => {
  if (events.length === 0) return '';
  
  if (events.length === 1) {
    return `"${events[0].title}" on ${new Date(events[0].scheduledDate).toLocaleDateString()} at ${events[0].scheduledTime}`;
  }
  
  return `${events.length} events: ${events.map(e => `"${e.title}"`).join(', ')}`;
};

