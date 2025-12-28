// Request DTOs
export interface CreateEventRequest {
  title: string;
  description?: string;
  eventType: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm:ss (Local time - backend will convert to UTC)
  expectedAttendees: number;
  budgetTotal?: number;
  budgetPerPerson?: number;
  estimatedDuration?: number;
  finalPlaceId?: string; // Optional: Organizer can select a final place directly (skip AI recommendation + voting)
  acceptanceThreshold?: number; // Optional: Acceptance threshold (0.0 to 1.0, default 0.7 = 70%)
}

export interface UpdateEventRequest extends CreateEventRequest {}

export interface InviteParticipantsRequest {
  userIds: string[];
}

export interface VoteRequest {
  optionId: string;
  voteValue: number; // -1 (downvote), 0 (neutral), 1-5 (rating)
  comment?: string;
}

export interface FinalizeEventRequest {
  optionId: string;
}

export interface CancelEventRequest {
  reason: string;
}

// Response DTOs
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
  acceptanceThreshold?: number; // Acceptance threshold (0.0 to 1.0, default 0.7 = 70%)
  maxAttendees?: number;
  budgetTotal?: number;
  budgetPerPerson?: number;
  status: string;
  privacy?: string; // "Public" or "Private"
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
  eventImageUrl?: string; // Event avatar/cover image URL
  acceptedCount: number;
  invitedCount: number;
  participants: ParticipantResponse[];
}

export interface AiAnalysisProgress {
  currentStep: number;
  currentStepName: string;
  progressPercentage: number;
  preferencesCollected?: number;
  totalParticipants?: number;
  preferencesAnalyzed?: boolean;
  cuisineTypesIdentified?: number;
  averageBudget?: number;
  venuesFound?: number;
  venuesFromTrackAsia?: number;
  venuesFromDatabase?: number;
  searchRadiusKm?: number;
  venuesEvaluated?: number;
  venuesScored?: number;
  venuesPassedThreshold?: number;
  geminiAnalysisCompleted?: boolean;
  venuesAnalyzedByGemini?: number;
  geminiTimeout?: boolean;
  finalRecommendationsCount?: number;
  lastUpdated?: string;
}

export interface ParticipantResponse {
  userId: string;
  fullName?: string;
  email?: string;
  invitationStatus: string;
  rsvpDate?: string;
  profilePictureUrl?: string | null;
}

export interface VenueOptionResponse {
  optionId: string;
  placeId: string | null;
  placeName?: string;
  placeAddress?: string;
  placeCategory?: string;
  averageRating?: number;
  totalReviews: number;
  placeLatitude?: number; // For distance calculation
  placeLongitude?: number; // For distance calculation
  placeImageUrl?: string; // Primary image URL for internal places
  aiScore?: number;
  aiReasoning?: string;
  pros: string[];
  cons: string[];
  estimatedCostPerPerson?: number;
  averageDistance?: number; // km
  averageDuration?: number; // minutes
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
  // Place verification status (only for internal places)
  verificationStatus?: 'Pending' | 'Approved' | 'Rejected' | null;
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
  voteScore: number;
}

// Event Share Types
export interface EventShareCreateRequest {
  sharedWithUserId?: string;
  sharedWithEmail?: string;
  permissionLevel?: string; // "View" | "Invite" | "Manage"
  expiresAt?: string;
}

export interface EventShareDetailResponse {
  shareId: string;
  eventId: string;
  sharedWithUserId?: string;
  sharedWithEmail?: string;
  permissionLevel?: string;
  expiresAt?: string;
  sharedAt: string;
  sharedBy: string;
  sharedByUserName: string;
  sharedWithUserName: string;
}

export interface EventShareViewResponse {
  shareId: string;
  eventId: string;
  eventTitle: string;
  sharedByUserName: string;
  sharedAt: string;
  permissionLevel: string;
}


