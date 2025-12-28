import axiosInstance, { formatErrorMessage } from "../utils/axios";
import type { 
  EventShareCreateRequest, 
  EventShareDetailResponse, 
  EventShareViewResponse 
} from "../types/event.types";

// Types
export interface EventRequest {
  title: string;
  description?: string;
  eventType: string;
  scheduledDate: string;
  scheduledTime: string; // Local time - backend will convert to UTC based on user's timezone
  expectedAttendees: number;
  budgetTotal?: number;
  budgetPerPerson?: number;
  estimatedDuration?: number;
  eventImageUrl?: string;
  finalPlaceId?: string; // Optional: Organizer can select a final place directly (skip AI recommendation + voting)
  acceptanceThreshold?: number; // Optional: Acceptance threshold (0.0 to 1.0, default 0.7 = 70%)
  privacy?: string; // "Public" or "Private", default "Public"
}

export interface EventResponse {
  eventId: string;
  organizerId: string;
  organizerName?: string;
  organizerEmail?: string;
  title: string;
  description?: string;
  eventType: string;
  scheduledDate: string;
  scheduledTime: string;
  timezone?: string;
  estimatedDuration?: number;
  expectedAttendees: number;
  maxAttendees?: number;
  budgetTotal?: number;
  budgetPerPerson?: number;
  status: string;
  votingDeadline?: string;
  rsvpDeadline?: string;
  finalPlaceId?: string;
  finalPlaceName?: string;
  createdAt: string;
  updatedAt?: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  aiAnalysisStartedAt?: string;
  aiAnalysisProgress?: string; // JSON string
  eventImageUrl?: string;
  acceptedCount: number;
  invitedCount: number;
  participants: ParticipantResponse[];
  privacy?: string; // "Public" or "Private"
}

export interface ParticipantResponse {
  userId: string;
  fullName: string;
  email: string;
  invitationStatus: string;
  rsvpDate?: string;
  profilePictureUrl?: string;
}

export interface VenueOptionResponse {
  optionId: string;
  placeId: string | null;
  placeName: string;
  placeAddress: string;
  placeCategory: string;
  averageRating?: number;
  totalReviews: number;
  aiScore?: number;
  aiReasoning: string;
  pros: string[];
  cons: string[];
  estimatedCostPerPerson?: number;
  totalVotes?: number;
  voteScore?: number;
  // External provider fields (for AI recommendations not yet in system)
  externalProvider?: string;
  externalPlaceId?: string;
  externalPlaceName?: string;
  externalAddress?: string;
  externalLatitude?: number;
  externalLongitude?: number;
  externalCategory?: string;
  externalRating?: number;
  externalTotalReviews?: number;
  externalPhoneNumber?: string;
  externalWebsiteUrl?: string;
}

export interface VoteRequest {
  optionId: string;
  voteValue: number;
  comment?: string;
}

export interface VoteStatisticsResponse {
  totalParticipants: number;
  votedCount: number;
  voteProgress: number;
  venueVotes: VenueVoteCount[];
  timeRemaining?: string;
}

export interface VenueVoteCount {
  optionId: string;
  venueName: string;
  voteCount: number;
  voteScore: number;
}

// Event Service
const eventService = {
  // Create event
  createEvent: async (data: EventRequest): Promise<EventResponse> => {
    try {
      // Convert to PascalCase for backend và format time; giữ nguyên đơn vị USD
      const requestData: any = {
        Title: data.title,
        Description: data.description || "",
        EventType: data.eventType,
        ScheduledDate: data.scheduledDate,
        ScheduledTime: data.scheduledTime.includes(':') && data.scheduledTime.split(':').length === 2
          ? `${data.scheduledTime}:00`
          : data.scheduledTime,
        ExpectedAttendees: data.expectedAttendees,
        BudgetTotal: data.budgetTotal,
        BudgetPerPerson: data.budgetPerPerson,
        EstimatedDuration: data.estimatedDuration,
        EventImageUrl: data.eventImageUrl || ""
      };
      
      // Add FinalPlaceId if provided (for direct venue selection)
      if (data.finalPlaceId) {
        requestData.FinalPlaceId = data.finalPlaceId;
      }
      
      // Add AcceptanceThreshold if provided (for custom acceptance threshold)
      if (data.acceptanceThreshold !== undefined) {
        requestData.AcceptanceThreshold = data.acceptanceThreshold;
      }
      
      // Add Privacy if provided (default "Public")
      if (data.privacy) {
        requestData.Privacy = data.privacy;
      }
      
      const response = await axiosInstance.post("/api/Event", requestData);
      return response.data;
    } catch (error: any) {
      const errorMessage = formatErrorMessage(error, "Failed to create event");
      const customError = new Error(errorMessage);
      (customError as any).response = error.response;
      throw customError;
    }
  },

  // Update event
  updateEvent: async (id: string, data: EventRequest): Promise<EventResponse> => {
    try {
      // Convert to PascalCase cho backend và format time; giữ nguyên đơn vị USD
      const requestData: any = {
        Title: data.title,
        Description: data.description || "",
        EventType: data.eventType,
        ScheduledDate: data.scheduledDate,
        ScheduledTime: data.scheduledTime.includes(':') && data.scheduledTime.split(':').length === 2
          ? `${data.scheduledTime}:00`
          : data.scheduledTime,
        ExpectedAttendees: data.expectedAttendees,
        BudgetTotal: data.budgetTotal,
        BudgetPerPerson: data.budgetPerPerson,
        EstimatedDuration: data.estimatedDuration,
        EventImageUrl: data.eventImageUrl || ""
      };
      
      // Add Privacy if provided
      if (data.privacy) {
        requestData.Privacy = data.privacy;
      }
      
      const response = await axiosInstance.put(`/api/Event/${id}`, requestData);
      return response.data;
    } catch (error: any) {
      const errorMessage = formatErrorMessage(error, "Failed to update event");
      const customError = new Error(errorMessage);
      (customError as any).response = error.response;
      throw customError;
    }
  },

  // Get event by ID
  getEvent: async (id: string): Promise<EventResponse> => {
    const response = await axiosInstance.get(`/api/Event/${id}`);
    return response.data;
  },

  // Get my events (as organizer)
  getMyEvents: async (): Promise<EventResponse[]> => {
    const response = await axiosInstance.get("/api/Event/my-events");
    return response.data;
  },

  // Get participating events
  getParticipatingEvents: async (): Promise<EventResponse[]> => {
    const response = await axiosInstance.get("/api/Event/participating");
    return response.data;
  },

  // Invite participants
  inviteParticipants: async (eventId: string, userIds: string[]): Promise<void> => {
    await axiosInstance.post(`/api/Event/${eventId}/invite`, { userIds });
  },

  // Accept invitation
  acceptInvitation: async (eventId: string): Promise<void> => {
    await axiosInstance.post(`/api/Event/${eventId}/accept`);
  },

  // Decline invitation
  declineInvitation: async (eventId: string): Promise<void> => {
    await axiosInstance.post(`/api/Event/${eventId}/decline`);
  },

  // Remove participant (organizer only)
  removeParticipant: async (eventId: string, participantId: string): Promise<void> => {
    await axiosInstance.delete(`/api/Event/${eventId}/participants/${participantId}`);
  },

  // Generate AI recommendations
  generateRecommendations: async (
    eventId: string,
    location?: { lat: number; lng: number },
    radiusKm?: number
  ): Promise<void> => {
    const requestBody = location && radiusKm
      ? {
          Latitude: location.lat,
          Longitude: location.lng,
          RadiusKm: radiusKm
        }
      : undefined;
    
    await axiosInstance.post(`/api/Event/${eventId}/generate-recommendations`, requestBody);
  },

  // Get recommendations
  getRecommendations: async (eventId: string): Promise<VenueOptionResponse[]> => {
    const response = await axiosInstance.get(`/api/Event/${eventId}/recommendations`);
    return response.data;
  },

  // Cast vote
  castVote: async (eventId: string, data: VoteRequest): Promise<void> => {
    await axiosInstance.post(`/api/Event/${eventId}/vote`, data);
  },

  // Get vote statistics
  getVotes: async (eventId: string): Promise<VoteStatisticsResponse> => {
    const response = await axiosInstance.get(`/api/Event/${eventId}/votes`);
    return response.data;
  },

  // Finalize event
  finalizeEvent: async (eventId: string, optionId: string): Promise<void> => {
    await axiosInstance.post(`/api/Event/${eventId}/finalize`, { optionId });
  },

  // Cancel event
  cancelEvent: async (eventId: string, reason: string): Promise<void> => {
    await axiosInstance.post(`/api/Event/${eventId}/cancel`, { reason });
  },

  // Event Share methods
  shareEvent: async (
    eventId: string,
    request: EventShareCreateRequest
  ): Promise<EventShareDetailResponse> => {
    const response = await axiosInstance.post(
      `/api/Event/${eventId}/share`,
      request
    );
    return response.data.data;
  },

  revokeShareEvent: async (shareId: string): Promise<void> => {
    await axiosInstance.delete(`/api/Event/share/${shareId}`);
  },

  getEventShares: async (
    eventId: string
  ): Promise<EventShareDetailResponse[]> => {
    const response = await axiosInstance.get(`/api/Event/${eventId}/shares`);
    return response.data.data;
  },

  getSharedEventsWithMe: async (): Promise<EventShareViewResponse[]> => {
    const response = await axiosInstance.get(
      `/api/Event/events/shared-with-me`
    );
    return response.data.data;
  },

  // Add manual place option
  addPlaceOption: async (eventId: string, placeId: string): Promise<VenueOptionResponse> => {
    const response = await axiosInstance.post(
      `/api/Event/${eventId}/add-place-option`,
      { placeId }
    );
    return response.data;
  },

  // Search TrackAsia places
  searchTrackAsiaPlaces: async (
    latitude: number,
    longitude: number,
    radius: number = 2000,
    type?: string
  ): Promise<any[]> => {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radius.toString(),
    });
    if (type) {
      params.append('type', type);
    }
    const url = `/api/Event/search-trackasia-places?${params.toString()}`;
    console.log('[eventService] TrackAsia API URL:', url);
    console.log('[eventService] Parameters:', { latitude, longitude, radius, type });
    
    const response = await axiosInstance.get(url);
    console.log('[eventService] Response data count:', response.data?.length || 0);
    return response.data;
  },

  // Get TrackAsia place details
  getTrackAsiaPlaceDetails: async (placeId: string): Promise<any> => {
    const TRACKASIA_API_KEY = import.meta.env.VITE_TRACKASIA_API_KEY || 'public_key';
    const url = `https://maps.track-asia.com/api/v2/place/details/json?place_id=${encodeURIComponent(placeId)}&key=${TRACKASIA_API_KEY}&new_admin=true&include_old_admin=true`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(data.error_message || 'Failed to fetch place details');
    }
    
    return data.result;
  },

  // Phase 1: Reschedule Event
  rescheduleEvent: async (
    eventId: string,
    newDate: string,
    newTime: string,
    reason?: string
  ): Promise<void> => {
    await axiosInstance.put(`/api/Event/${eventId}/reschedule`, {
      newDate,
      newTime,
      reason: reason || "No reason provided"
    });
  },

  // Phase 1: Get Check-in Status
  getCheckInStatus: async (eventId: string): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/api/Event/${eventId}/checkin`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // Check-in not found
      }
      throw error;
    }
  },

  // Phase 1: Get Waitlist Status
  getWaitlistStatus: async (eventId: string): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/api/Event/${eventId}/waitlist/status`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // Not on waitlist
      }
      throw error;
    }
  },

  // Phase 1: Check-in to Event
  checkInEvent: async (
    eventId: string,
    latitude?: number,
    longitude?: number,
    checkInMethod: string = "manual"
  ): Promise<void> => {
    await axiosInstance.post(`/api/Event/${eventId}/checkin`, {
      latitude,
      longitude,
      checkInMethod
    });
  },

  // Phase 1: Get Event Feedback
  getEventFeedback: async (eventId: string): Promise<any> => {
    try {
      const response = await axiosInstance.get(`/api/Event/${eventId}/feedback`);
      const data = response.data;
      // Map PascalCase to camelCase for consistency
      if (data) {
        return {
          venueRating: data.venueRating ?? data.VenueRating,
          foodRating: data.foodRating ?? data.FoodRating,
          overallRating: data.overallRating ?? data.OverallRating,
          comments: data.comments ?? data.Comments,
          suggestions: data.suggestions ?? data.Suggestions,
          wouldAttendAgain: data.wouldAttendAgain ?? data.WouldAttendAgain,
          submittedAt: data.submittedAt ?? data.SubmittedAt,
        };
      }
      return null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // Feedback not found
      }
      throw error;
    }
  },

  // Phase 1: Submit Event Feedback
  submitEventFeedback: async (
    eventId: string,
    data: {
      venueRating: number;
      foodRating: number;
      overallRating: number;
      comments?: string;
      suggestions?: string;
      wouldAttendAgain: boolean;
    }
  ): Promise<any> => {
    const response = await axiosInstance.post(`/api/Event/${eventId}/feedback`, data);
    return response.data;
  },

  // Phase 1: Update Event Feedback
  updateEventFeedback: async (
    eventId: string,
    data: {
      venueRating: number;
      foodRating: number;
      overallRating: number;
      comments?: string;
      suggestions?: string;
      wouldAttendAgain: boolean;
    }
  ): Promise<any> => {
    const response = await axiosInstance.put(`/api/Event/${eventId}/feedback`, data);
    return response.data;
  },

  // Phase 2: Analytics
  getEventAnalytics: async (eventId: string): Promise<any> => {
    const response = await axiosInstance.get(`/api/Event/${eventId}/analytics`);
    return response.data;
  },

  getOrganizerAnalytics: async (startDate?: string, endDate?: string): Promise<any> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await axiosInstance.get(
      `/api/Event/organizer/analytics?${params.toString()}`
    );
    return response.data;
  },

  getEventTrends: async (months: number = 6): Promise<any> => {
    const response = await axiosInstance.get(`/api/Event/organizer/trends?months=${months}`);
    return response.data;
  },

  getParticipationStats: async (eventId: string): Promise<any> => {
    const response = await axiosInstance.get(`/api/Event/${eventId}/participation-stats`);
    return response.data;
  },

  // Phase 2: Event Templates
  createEventTemplate: async (data: {
    templateName: string;
    description?: string;
    title: string;
    eventDescription?: string;
    eventType: string;
    estimatedDuration?: number;
    expectedAttendees: number;
    maxAttendees?: number;
    budgetTotal?: number;
    budgetPerPerson?: number;
    timezone?: string;
    isPublic: boolean;
    isDefault: boolean;
  }): Promise<any> => {
    const response = await axiosInstance.post("/api/Event/templates", data);
    return response.data;
  },

  getEventTemplates: async (publicOnly: boolean = false): Promise<any[]> => {
    const response = await axiosInstance.get(
      `/api/Event/templates?publicOnly=${publicOnly}`
    );
    return response.data;
  },

  createEventFromTemplate: async (
    templateId: string,
    scheduledDate: string,
    scheduledTime: string
  ): Promise<EventResponse> => {
    const response = await axiosInstance.post(
      `/api/Event/templates/${templateId}/create-event`,
      { scheduledDate, scheduledTime }
    );
    return response.data;
  },

  getEventTemplate: async (templateId: string): Promise<any> => {
    const response = await axiosInstance.get(`/api/Event/templates/${templateId}`);
    return response.data;
  },

  updateEventTemplate: async (
    templateId: string,
    data: {
      templateName: string;
      description?: string;
      title: string;
      eventDescription?: string;
      eventType: string;
      estimatedDuration?: number;
      expectedAttendees: number;
      maxAttendees?: number;
      budgetTotal?: number;
      budgetPerPerson?: number;
      timezone?: string;
      isPublic: boolean;
      isDefault: boolean;
    }
  ): Promise<any> => {
    const response = await axiosInstance.put(`/api/Event/templates/${templateId}`, data);
    return response.data;
  },

  deleteEventTemplate: async (templateId: string): Promise<void> => {
    await axiosInstance.delete(`/api/Event/templates/${templateId}`);
  },

  // Phase 2: Recurring Events
  createRecurringEvent: async (data: {
    title: string;
    description?: string;
    eventType: string;
    recurrencePattern: string;
    daysOfWeek?: string;
    dayOfMonth?: number;
    month?: number;
    dayOfYear?: number;
    scheduledTime: string;
    estimatedDuration?: number;
    expectedAttendees: number;
    budgetPerPerson?: number;
    startDate: string;
    endDate?: string;
    occurrenceCount?: number;
    autoCreateEvents: boolean;
    daysInAdvance: number;
  }): Promise<any> => {
    const response = await axiosInstance.post("/api/Event/recurring", data);
    return response.data;
  },

  getRecurringEvents: async (): Promise<any[]> => {
    const response = await axiosInstance.get("/api/Event/recurring");
    return response.data;
  },

  getRecurringEventById: async (id: string) => {
    const response = await axiosInstance.get(`/api/Event/recurring/${id}`);
    return response.data;
  },

  updateRecurringEvent: async (id: string, data: any) => {
    const response = await axiosInstance.put(`/api/Event/recurring/${id}`, data);
    return response.data;
  },

  deleteRecurringEvent: async (id: string) => {
    const response = await axiosInstance.delete(`/api/Event/recurring/${id}`);
    return response.data;
  },

  toggleRecurringEventStatus: async (id: string, status: 'active' | 'paused') => {
    const response = await axiosInstance.patch(`/api/Event/recurring/${id}/status`, { status });
    return response.data;
  },

  // Request to join event (for public events in inviting status)
  requestToJoin: async (eventId: string): Promise<void> => {
    await axiosInstance.post(`/api/Event/${eventId}/request-join`);
  },

  // Phase 2: Waitlist
  joinWaitlist: async (
    eventId: string,
    priority?: number,
    notes?: string
  ): Promise<void> => {
    await axiosInstance.post(`/api/Event/${eventId}/waitlist`, {
      priority,
      notes
    });
  },

  getEventWaitlist: async (eventId: string): Promise<any[]> => {
    const response = await axiosInstance.get(`/api/Event/${eventId}/waitlist`);
    return response.data;
  },

  promoteFromWaitlist: async (eventId: string, userId: string): Promise<void> => {
    await axiosInstance.post(`/api/Event/${eventId}/waitlist/${userId}/promote`);
  },

  // Upload event image
  uploadEventImage: async (eventId: string, imageFile: File): Promise<string> => {
    const formData = new FormData();
    formData.append('imageFile', imageFile);
    
    const response = await axiosInstance.patch(
      `/api/Event/${eventId}/upload-image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data.fileUrl;
  },

  // Generate event cover image with AI
  generateEventCoverImage: async (data: {
    title: string;
    description?: string;
    eventType?: string;
    location?: string;
    country?: string;
  }): Promise<string> => {
    const response = await axiosInstance.post(
      '/api/Event/generate-cover-image',
      data
    );
    return response.data.data; // API returns { success, message, statusCode, data, errors }
  },

  // Convert external place (TrackAsia) to internal place in system
  convertExternalPlaceToInternal: async (
    eventId: string,
    optionId: string
  ): Promise<VenueOptionResponse> => {
    const response = await axiosInstance.post(
      `/api/Event/${eventId}/option/${optionId}/convert-to-internal`
    );
    return response.data;
  },

  // Get branch events summary with privacy filtering
  getBranchEventsSummary: async (
    branchId?: string,
    timeFilter?: 'Upcoming' | 'Past',
    statusFilter?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    page: number;
    pageSize: number;
    totalItems: number;
    items: EventResponse[];
  }> => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (timeFilter) params.append('timeFilter', timeFilter);
    if (statusFilter) params.append('statusFilter', statusFilter);
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    
    const response = await axiosInstance.get(
      `/api/Event/branch-summary?${params.toString()}`
    );
    return response.data;
  },
};

export default eventService;


