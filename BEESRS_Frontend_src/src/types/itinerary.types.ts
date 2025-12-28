// Itinerary Types

export type ItineraryPurpose = "Business" | "Leisure" | "Mixed";

export type TransportMethod =
  | "Walking"
  | "Driving"
  | "PublicTransport"
  | "Bicycle"
  | "Flight";

export type BookingStatus =
  | "NotBooked"
  | "Pending"
  | "Confirmed"
  | "Cancelled";

export type TimeOfDay = "Morning" | "Noon" | "Afternoon" | "Evening" | "Dinner";

export interface Place {
  placeId: string;
  placeName: string;
  address: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  description?: string;
  placeDetail?: any; // Full place detail with rating, category, price level, etc.
}

export interface ItineraryItem {
  itemId: string;
  itineraryId: string;
  placeId: string;
  place?: Place;
  dayNumber: number;
  orderInDay: number;
  sortOrder?: number;
  timeOfDay: TimeOfDay;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  actualDuration?: number;
  estimatedDuration?: number;
  activityTitle?: string;
  activityDescription?: string;
  activityType?: string;
  transportMethod?: TransportMethod;
  transportDuration?: number;
  transportCost?: number;
  estimatedCost?: number;
  actualCost?: number;
  bookingReference?: string;
  bookingStatus?: BookingStatus;
  notes?: string;
  completionNotes?: string;
  isCompleted?: boolean;
  distanceFromPrevious?: number;
  travelTimeFromPrevious?: number;
}

export interface Itinerary {
  itineraryId: string;
  userId: string;
  title: string;
  description?: string;
  purpose?: ItineraryPurpose; // Legacy field, kept for backward compatibility
  tripType?: string; // New field from API
  destinationCity?: string;
  destinationCountry?: string;
  startDate: string;
  endDate: string;
  isTemplate?: boolean;
  isPublic?: boolean;
  templateCategory?: string;
  status?: string;
  totalDays?: number;
  totalItems?: number;
  estimatedTotalCost?: number;
  totalBudget?: number;
  totalEstimateCost?: number; // From API
  totalActualCost?: number; // From API
  currency?: string;
  ItineraryImageUrl?: string; // Cover/avatar image URL
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  items?: ItineraryItem[];
}

export interface CreateItineraryRequest {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  tripType: string;
  destinationCity: string;
  destinationCountry: string;
  totalBudget?: number;
  currency?: string;
  isPublic?: boolean;
  templateCategory?: string; // For create-as-template
  status?: string;
  ItineraryImageUrl?: string; // Cover/avatar image URL
  itineraryItems?: CreateItineraryItemInRequest[];
}

export interface CreateItineraryItemInRequest {
  placeId: string;
  dayNumber: number;
  startTime?: string;
  endTime?: string;
  estimatedDuration?: number;
  activityTitle?: string;
  activityDescription?: string;
  activityType?: string;
  estimatedCost?: number;
  actualCost?: number;
  bookingReference?: string;
  bookingStatus?: string;
  transportMethod?: string;
  transportCost?: number;
  isCompleted?: boolean;
  completionNotes?: string;
  sortOrder?: number;
}

export interface UpdateItineraryRequest {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  tripType?: string;
  destinationCity?: string;
  destinationCountry?: string;
  totalBudget?: number;
  currency?: string;
  isPublic?: boolean;
  isTemplate?: boolean;
  templateCategory?: string;
  status?: string;
  completedAt?: string | null; // Completion timestamp
  ItineraryImageUrl?: string; // Cover/avatar image URL
}

export interface CreateItineraryItemRequest {
  placeId: string;
  dayNumber: number;
  startTime?: string;
  endTime?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  activityTitle?: string;
  activityDescription?: string;
  activityType?: string;
  estimatedCost?: number;
  actualCost?: number;
  bookingReference?: string;
  bookingStatus?: string;
  transportMethod?: string;
  transportCost?: number;
  isCompleted?: boolean;
  completionNotes?: string;
  sortOrder?: number;
}

export interface UpdateItineraryItemRequest {
  placeId?: string;
  dayNumber?: number;
  startTime?: string;
  endTime?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  activityTitle?: string;
  activityDescription?: string;
  activityType?: string;
  estimatedCost?: number;
  actualCost?: number;
  bookingReference?: string;
  bookingStatus?: string;
  transportMethod?: string;
  transportDuration?: number;
  transportCost?: number;
  isCompleted?: boolean;
  completionNotes?: string;
  sortOrder?: number;
}

export interface ReorderItemsRequest {
  itemId: string;
  newSortOrder: number;
  newDayNumber: number;
  newActivityType?: string;
}

export interface ReorderItemsBatchRequest {
  items: ReorderItemsRequest[];
}

export interface ShareItineraryRequest {
  sharedWithUserId: string;
  sharedWithEmail?: string;
  canEdit: boolean;
  message?: string;
}

export interface ItineraryShare {
  shareId: string;
  itineraryId: string;
  sharedByUserId: string;
  sharedWithUserId: string;
  canEdit: boolean;
  sharedAt: string;
  sharedWithUser?: {
    userId: string;
    userName: string;
    email: string;
    avatar?: string;
  };
}

export interface RouteOptimizationResult {
  optimizedItems: ItineraryItem[];
  totalDistance: number;
  totalTravelTime: number;
  estimatedCost?: number;
  suggestions?: string[];
}

export interface DistanceCalculation {
  totalDistance: number;
  itemDistances: {
    itemId: string;
    distanceFromPrevious: number;
    travelTimeFromPrevious: number;
  }[];
}

export interface ItineraryStatistics {
  totalItineraries: number;
  totalTemplates: number;
  totalShared: number;
  totalPlacesVisited: number;
  favoriteDestinations: string[];
  totalEstimatedCost: number;
}

export interface SearchItineraryParams {
  Page?: number;
  PageSize?: number;
  Title?: string;
  TripType?: string;
  DestinationCountry?: string;
}

export interface PaginatedResponse<T> {
  page: number;
  pageSize: number;
  totalItems: number;
  items: T[];
}

// Analytics Types
export interface UserStatistics {
  itnerariesCreated: number; // Note: API has typo "itneraries" instead of "itineraries"
  templatesCreated: number;
  itinerariesCompleted: number;
  itinerariesShared: number;
}

export interface ItineraryStatistics {
  shareCount: number;
  totalDaysPlanned: number;
  totalItineraryItems: number;
  totalEstimatedCost: number;
  completionRate: number;
  totalBudget: number;
  actualTotalCost: number;
  totalTransportCost: number;
  lastUpdated: string;
}

