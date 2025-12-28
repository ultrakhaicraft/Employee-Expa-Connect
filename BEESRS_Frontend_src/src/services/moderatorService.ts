import apiClient, { formatErrorMessage } from "../utils/axios";

export interface ModeratorPlaceSummary {
  placeId: string;
  name: string;
  categoryId: number;
  categoryName: string;
  latitude: number;
  longitude: number;
  priceLevel: number;
  verificationStatus: string;
  averageRating: number;
}

export interface PaginatedModeratorPlaces {
  page: number;
  pageSize: number;
  totalItems: number;
  items: ModeratorPlaceSummary[];
}

export const GetAllPlaces = async (requestData?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PaginatedModeratorPlaces> => {
  const page = requestData?.page ?? 1;
  const pageSize = requestData?.pageSize ?? 10;
  const search = requestData?.search ?? "";

  try {
    const response = await apiClient.post("/Place", {
      page,
      pageSize,
      search,
    });

    if (!response || response.data === undefined || response.data === null) {
      return { page, pageSize, totalItems: 0, items: [] };
    }

    return response.data;
  } catch (error: any) {
    console.warn("GetAllPlaces error:", error.response?.status, error.message);
    return { page, pageSize, totalItems: 0, items: [] };
  }
};

export const ViewAllPendingPlace = async () => {
    try {
      const response = await apiClient.get("/Place/get-all-pending-place");
      if (!response || response.data === undefined || response.data === null) {
        return { items: [] };
      }
      return response.data;
    } catch (error: any) {
      console.warn('ViewAllPendingPlace error:', error.response?.status, error.message);
      return { items: [] };
    }
  };
  
export const VerifyPlace = async (verificationData: {
  status: string;
  notes: string;
  placeId: string;
}) => {
    try {
      const response = await apiClient.put("/Place/verify-place", verificationData);
      if (!response || !response.data) {
        throw new Error("Invalid response from the server");
      }
      return response.data;
    } catch (error: any) {
      const errorMessage = formatErrorMessage(error, "Failed to verify place");
      const customError = new Error(errorMessage);
      (customError as any).response = error.response;
      throw customError;
    }
  };

  export const ViewAllReportedReview = async (requestData: {
  page?: number;
  pageSize?: number;
}) => {
  try {
    const page = requestData.page || 1;
    const pageSize = requestData.pageSize || 10;
    const response = await apiClient.get(`/PlaceReviews/get-flagged-reviews?page=${page}&pageSize=${pageSize}`);
    if (!response || response.data === undefined || response.data === null) {
      return {
        page,
        pageSize,
        totalItems: 0,
        items: []
      };
    }
    return response.data;
  } catch (error: any) {
    console.warn('ViewAllReportedReview error:', error.response?.status, error.message);
    return {
      page: requestData.page || 1,
      pageSize: requestData.pageSize || 10,
      totalItems: 0,
      items: []
    };
  }
};

export const SolveReportedReview = async (solveData: {
  reviewId: string;
  isValidReport: boolean;
  moderationReason: string;
}) => {
  try {
    const response = await apiClient.post(`/PlaceReviews/resolve-report`, solveData);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to solve reported review");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export interface ModeratorEvent {
  eventId: string;
  title: string;
  description?: string;
  eventType: string;
  scheduledDate: string;
  scheduledTime: string;
  timezone?: string; // Timezone of the event (e.g., "UTC+07:00")
  status: string;
  organizerId: string;
  organizerName?: string;
  organizerEmail?: string;
  expectedAttendees: number;
  maxAttendees?: number;
  acceptedParticipantsCount: number;
  totalParticipantsCount: number;
  finalPlaceId?: string;
  finalPlaceName?: string;
  createdAt: string;
  updatedAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  completedAt?: string;
}

export interface ModeratorEventsResponse {
  page: number;
  pageSize: number;
  totalItems: number;
  items: ModeratorEvent[];
}

export const GetEventsInArea = async (params: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}): Promise<ModeratorEventsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);

    const url = `/api/ModeratorDashboard/events?${queryParams.toString()}`;
    console.log('Fetching events from:', url);
    
    const response = await apiClient.get(url);
    console.log('Events response:', response.data);
    return response.data;
  } catch (error: any) {
    console.warn('GetEventsInArea error:', error.response?.status, error.message);
    return {
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      totalItems: 0,
      items: []
    };
  }
};

export interface ModeratorStatistics {
  totalEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  eventsByStatus: Record<string, number>;
}

export const GetModeratorStatistics = async (): Promise<ModeratorStatistics> => {
  try {
    const response = await apiClient.get('/api/ModeratorDashboard/statistics');
    return response.data ?? {
      totalEvents: 0,
      upcomingEvents: 0,
      completedEvents: 0,
      cancelledEvents: 0,
      eventsByStatus: {},
    };
  } catch (error: any) {
    console.warn('GetModeratorStatistics error:', error.response?.status, error.message);
    return {
      totalEvents: 0,
      upcomingEvents: 0,
      completedEvents: 0,
      cancelledEvents: 0,
      eventsByStatus: {},
    };
  }
};

export interface EventDetailStatistics {
  participants: {
    accepted: number;
    pending: number;
    declined: number;
    total: number;
  };
  checkIns: number;
  checkInRate: number;
  feedbacks: number;
  feedbackRate: number;
  votes: number;
  waitlist: number;
  ratings: {
    venue: number;
    food: number;
    overall: number;
  };
  placeOptions: number;
}

export interface EventParticipantDetail {
  userId: string;
  userName?: string;
  userEmail?: string;
  status: string;
  rsvpDate?: string;
  invitedAt: string;
}

export interface EventCheckInDetail {
  userId: string;
  userName?: string;
  checkedInAt: string;
  checkInMethod?: string;
}

export interface EventFeedbackDetail {
  userId: string;
  userName?: string;
  venueRating: number;
  foodRating: number;
  overallRating: number;
  comments?: string;
  suggestions?: string;
  wouldAttendAgain: boolean;
  submittedAt: string;
}

export interface EventDetailResponse {
  eventId: string;
  title: string;
  description?: string;
  eventType: string;
  scheduledDate: string;
  scheduledTime: string;
  timezone?: string;
  estimatedDuration?: number;
  status: string;
  organizerId: string;
  organizerName?: string;
  organizerEmail?: string;
  expectedAttendees: number;
  maxAttendees?: number;
  budgetTotal?: number;
  budgetPerPerson?: number;
  finalPlaceId?: string;
  finalPlaceName?: string;
  finalPlaceAddress?: string;
  createdAt: string;
  updatedAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  cancellationReason?: string;
  rescheduleCount: number;
  statistics: EventDetailStatistics;
  participants: EventParticipantDetail[];
  checkIns: EventCheckInDetail[];
  feedbacks: EventFeedbackDetail[];
}

export const GetEventDetails = async (eventId: string): Promise<EventDetailResponse | null> => {
  try {
    const response = await apiClient.get(`/api/ModeratorDashboard/events/${eventId}`);
    return response.data ?? null;
  } catch (error: any) {
    console.warn('GetEventDetails error:', error.response?.status, error.message);
    return null;
  }
};

export const DeleteEvent = async (eventId: string, reason?: string): Promise<void> => {
  try {
    await apiClient.delete(`/api/ModeratorDashboard/events/${eventId}`, {
      data: { reason: reason || 'Deleted by moderator' }
    });
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to delete event");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const GetAllReportedPlaces = async () => {
  try {
    const response = await apiClient.get('/api/PlaceReports/get-all-place-have-report');
    return response.data ?? [];
  } catch (error: any) {
    console.warn('GetAllReportedPlaces error:', error.response?.status, error.message);
    return [];
  }
};

export const GetAllReportedOfOnePlace = async (placeId: string) => {
  try {
    const response = await apiClient.get(`/api/PlaceReports/get-all-reoprt-by-place-id?placeId=${placeId}`);
    return response.data ?? [];
  } catch (error: any) {
    console.warn('GetAllReportedOfOnePlace error:', error.response?.status, error.message);
    return [];
  }
};

export const SolveReportedPlace = async (solveData: {
  reportId: string;
  resolvedNote: string;
  isValid: boolean;
}) => {
  try {
    const response = await apiClient.put(`/api/PlaceReports/resolve-report`, solveData);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to solve all reported place"); 
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const SolveAllReportedOfPlace = async (solveData: {
  placeId: string;
  resolvedNote: string;
 
}) => {
  try {
    const response = await apiClient.post(`/api/PlaceReports/resolve-all-reort-of-place`, solveData);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to solve all reported place");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const DeletePlace = async (placeId: string) => {
  try {
    const response = await apiClient.delete(`/Place/delete-place?placeId=${placeId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to delete place");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export interface UserListItem {
  userId: string;
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  roleId: number;
  roleName: string;
  isActive: boolean;
  jobTitle: string;
  currentBranchName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedUsers {
  page: number;
  pageSize: number;
  totalItems: number;
  items: UserListItem[];
}

export const GetUsersInArea = async (params: {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}): Promise<PaginatedUsers> => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

    const response = await apiClient.get(`/api/ModeratorDashboard/users?${queryParams.toString()}`);
    return response.data;
  } catch (error: any) {
    console.warn('GetUsersInArea error:', error.response?.status, error.message);
    return {
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      totalItems: 0,
      items: []
    };
  }
};

export const ToggleUserStatus = async (userId: string) => {
  try {
    const response = await apiClient.put(`/api/ModeratorDashboard/users/${userId}/toggle-status`);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to toggle user status");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export interface UserProfileDetail {
  profileId: string;
  userId: string;
  homeCountry?: string;
  currentLocationCity?: string;
  currentLocationCountry?: string;
  currentBranch?: string;
  timezone?: string;
  dateFormat?: string;
  profilePictureUrl?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserInfo {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  employeeId: string;
  currentBranch?: string;
  currentBranchId?: string;
  jobTitle?: string;
  phoneNumber?: string;
  roleName: string;
  friendshipStatus: string;
  emailVerified: boolean;
  profile?: UserProfileDetail;
}

export const GetUserDetails = async (userId: string): Promise<UserInfo> => {
  try {
    const response = await apiClient.get(`/api/ModeratorDashboard/users/${userId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to fetch user details");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export interface RoleDistribution {
  roleName: string;
  count: number;
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  roleDistribution: RoleDistribution[];
}

export interface StatusDistribution {
  status: string;
  count: number;
}

export interface TypeDistribution {
  type: string;
  count: number;
}

export interface EventAnalytics {
  totalEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  statusDistribution: StatusDistribution[];
  typeDistribution: TypeDistribution[];
}

export interface TopPlace {
  placeId: string;
  name: string;
  rating: number;
  totalReviews: number;
}

export interface PlaceAnalytics {
  totalPlaces: number;
  verifiedPlaces: number;
  pendingPlaces: number;
  reportedPlaces: number;
  topRatedPlaces: TopPlace[];
}

export interface MonthlyTrend {
  month: string;
  eventCount: number;
  userRegistrationCount: number;
}

export interface ModeratorAnalytics {
  userStats: UserAnalytics;
  eventStats: EventAnalytics;
  placeStats: PlaceAnalytics;
  activityTrends: MonthlyTrend[];
}

export const GetModeratorAnalytics = async (): Promise<ModeratorAnalytics> => {
  try {
    const response = await apiClient.get('/api/ModeratorDashboard/analytics');
    return response.data;
  } catch (error: any) {
    console.warn('GetModeratorAnalytics error:', error.response?.status, error.message);
    throw error;
  }
};
