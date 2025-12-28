import apiClient from "../utils/axios";
import { uploadToCloudinary } from "./cloudinaryService";
import type {
  Itinerary,
  CreateItineraryRequest,
  UpdateItineraryRequest,
  ItineraryItem,
  CreateItineraryItemRequest,
  UpdateItineraryItemRequest,
  ReorderItemsBatchRequest,
  ShareItineraryRequest,
  ItineraryShare,
  RouteOptimizationResult,
  DistanceCalculation,
  ItineraryStatistics,
  UserStatistics,
  SearchItineraryParams,
  PaginatedResponse,
} from "../types/itinerary.types";
import { convertUtcToLocalTime, getTimezoneFromStorage } from "@/utils/timezone";

// Helper function to normalize date to ISO string
const normalizeDate = (date: any): string | undefined => {
  if (!date) return undefined;
  if (typeof date === 'string') {
    // If it's already a string, try to parse and return ISO string
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }
  // If it's a Date object or DateTime, convert to ISO string
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return isNaN(dateObj.getTime()) ? undefined : dateObj.toISOString();
  } catch {
    return undefined;
  }
};

// ============ ITINERARY CRUD ============
export const createItinerary = async (
  data: CreateItineraryRequest
): Promise<Itinerary> => {
  const response = await apiClient.post("/api/itinerary/create-new", data);
  // Check if API returns wrapped format
  return response.data.data || response.data;
};

export const createItineraryAsTemplate = async (
  data: CreateItineraryRequest
): Promise<Itinerary> => {
  const response = await apiClient.post("/api/itinerary/create-as-template", data);
  return response.data.data; // API returns { success, message, statusCode, data, errors }
};

export const getItineraryById = async (id: string): Promise<Itinerary | null> => {
  try {
    const response = await apiClient.get(`/api/itinerary/detail/${id}`);
    const data = response.data?.data;
    if (!data) {
      return null;
    }
    
    // Normalize field names and dates
    return {
      ...data,
      itineraryId: data.ItineraryId || data.itineraryId || data.id || id,
      userId: data.UserId || data.userId,
      title: data.Title || data.title,
      description: data.Description || data.description,
      tripType: data.TripType || data.tripType,
      destinationCity: data.DestinationCity || data.destinationCity,
      destinationCountry: data.DestinationCountry || data.destinationCountry,
      startDate: normalizeDate(data.StartDate || data.startDate) || data.startDate,
      endDate: normalizeDate(data.EndDate || data.endDate) || data.endDate,
      isTemplate: data.IsTemplate ?? data.isTemplate,
      isPublic: data.IsPublic ?? data.isPublic,
      templateCategory: data.TemplateCategory || data.templateCategory,
      status: data.Status || data.status,
      createdAt: normalizeDate(data.CreatedAt || data.createdAt) || data.createdAt,
      updatedAt: data.UpdatedAt ? normalizeDate(data.UpdatedAt) : data.updatedAt,
      completedAt: data.CompletedAt ? normalizeDate(data.CompletedAt) : data.completedAt,
      estimatedTotalCost: data.EstimatedTotalCost ?? data.estimatedTotalCost,
      totalBudget: data.TotalBudget ?? data.totalBudget,
      totalEstimateCost: data.TotalEstimateCost ?? data.totalEstimateCost,
      totalActualCost: data.TotalActualCost ?? data.totalActualCost,
      currency: data.Currency || data.currency,
      ItineraryImageUrl: (data.ItineraryImageUrl || data.itineraryImageUrl || '').trim() || undefined,
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const getAllItineraries = async (
  params?: SearchItineraryParams
): Promise<PaginatedResponse<Itinerary>> => {
  const fallback = { page: params?.Page ?? 1, pageSize: params?.PageSize ?? 20, totalItems: 0, items: [] };
  try {
    const response = await apiClient.get("/api/itinerary/search-all", { 
      params: params || { Page: 1, PageSize: 20 }
    });
    const raw = response.data?.data;
    if (!raw) {
      return fallback;
    }
    
    const items = raw.Items || raw.items || (Array.isArray(raw) ? raw : []);
    const page = raw.Page ?? raw.page ?? (params?.Page ?? 1);
    const pageSize = raw.PageSize ?? raw.pageSize ?? (params?.PageSize ?? 20);
    const totalItems = raw.TotalItems ?? raw.totalItems ?? items.length;
    
    const normalizedItems = items.map((item: any) => ({
      ...item,
      // Normalize field names from PascalCase to camelCase
      itineraryId: item.ItineraryId || item.itineraryId || item.id,
      userId: item.UserId || item.userId,
      title: item.Title || item.title,
      description: item.Description || item.description,
      tripType: item.TripType || item.tripType,
      destinationCity: item.DestinationCity || item.destinationCity,
      destinationCountry: item.DestinationCountry || item.destinationCountry,
      startDate: normalizeDate(item.StartDate || item.startDate),
      endDate: normalizeDate(item.EndDate || item.endDate),
      isTemplate: item.IsTemplate ?? item.isTemplate,
      isPublic: item.IsPublic ?? item.isPublic,
      templateCategory: item.TemplateCategory || item.templateCategory,
      status: item.Status || item.status,
      createdAt: normalizeDate(item.CreatedAt || item.createdAt),
      updatedAt: normalizeDate(item.UpdatedAt || item.updatedAt),
      completedAt: normalizeDate(item.CompletedAt || item.completedAt),
      estimatedTotalCost: item.EstimatedTotalCost ?? item.estimatedTotalCost,
      totalBudget: item.TotalBudget ?? item.totalBudget,
      totalEstimateCost: item.TotalEstimateCost ?? item.totalEstimateCost,
      totalActualCost: item.TotalActualCost ?? item.totalActualCost,
      currency: item.Currency || item.currency,
      ItineraryImageUrl: (item.ItineraryImageUrl || item.itineraryImageUrl || '').trim() || undefined,
    }));
    
    return { page, pageSize, totalItems, items: normalizedItems };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return fallback;
    }
    throw error;
  }
};

export const searchItineraries = async (
  params: SearchItineraryParams
): Promise<PaginatedResponse<Itinerary>> => {
  const fallback = { page: params?.Page ?? 1, pageSize: params?.PageSize ?? 20, totalItems: 0, items: [] };
  try {
    const response = await apiClient.get("/api/itinerary/search-all", { params });
    const raw = response.data?.data;
    if (!raw) {
      return fallback;
    }
    
    const items = raw.Items || raw.items || (Array.isArray(raw) ? raw : []);
    const page = raw.Page ?? raw.page ?? (params?.Page ?? 1);
    const pageSize = raw.PageSize ?? raw.pageSize ?? (params?.PageSize ?? 20);
    const totalItems = raw.TotalItems ?? raw.totalItems ?? items.length;
    
    const normalizedItems = items.map((item: any) => ({
      ...item,
      // Normalize field names from PascalCase to camelCase
      itineraryId: item.ItineraryId || item.itineraryId || item.id,
      userId: item.UserId || item.userId,
      title: item.Title || item.title,
      description: item.Description || item.description,
      tripType: item.TripType || item.tripType,
      destinationCity: item.DestinationCity || item.destinationCity,
      destinationCountry: item.DestinationCountry || item.destinationCountry,
      startDate: normalizeDate(item.StartDate || item.startDate),
      endDate: normalizeDate(item.EndDate || item.endDate),
      isTemplate: item.IsTemplate ?? item.isTemplate,
      isPublic: item.IsPublic ?? item.isPublic,
      templateCategory: item.TemplateCategory || item.templateCategory,
      status: item.Status || item.status,
      createdAt: normalizeDate(item.CreatedAt || item.createdAt),
      updatedAt: normalizeDate(item.UpdatedAt || item.updatedAt),
      completedAt: normalizeDate(item.CompletedAt || item.completedAt),
      estimatedTotalCost: item.EstimatedTotalCost ?? item.estimatedTotalCost,
      totalBudget: item.TotalBudget ?? item.totalBudget,
      totalEstimateCost: item.TotalEstimateCost ?? item.totalEstimateCost,
      totalActualCost: item.TotalActualCost ?? item.totalActualCost,
      currency: item.Currency || item.currency,
      ItineraryImageUrl: (item.ItineraryImageUrl || item.itineraryImageUrl || '').trim() || undefined,
    }));
    
    return { page, pageSize, totalItems, items: normalizedItems };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return fallback;
    }
    throw error;
  }
};

export const updateItinerary = async (
  id: string,
  data: UpdateItineraryRequest
): Promise<Itinerary> => {
  console.log("Updating itinerary with data:", JSON.stringify(data, null, 2));
  const response = await apiClient.put(`/api/itinerary/update-itinerary/${id}`, data);
  // Check if API returns wrapped format
  return response.data.data || response.data;
};

export const deleteItinerary = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/itinerary/delete-itinerary/${id}`);
};

export const duplicateItinerary = async (id: string): Promise<Itinerary> => {
  const response = await apiClient.post(`/api/itinerary/${id}/duplicate`);
  // Check if API returns wrapped format
  return response.data.data || response.data;
};

// ============ ITINERARY ITEMS ============
export const addItineraryItem = async (
  itineraryId: string,
  data: CreateItineraryItemRequest
): Promise<ItineraryItem> => {
  // Convert time strings from "HH:mm" to "HH:mm:ss" format for TimeSpan
  // Backend can parse TimeSpan from "HH:mm:ss" format directly
  let startTime = data.startTime;
  let endTime = data.endTime;
  
  // Convert "HH:mm" to "HH:mm:ss" format
  if (startTime && typeof startTime === 'string') {
    const parts = startTime.split(':');
    if (parts.length === 2) {
      startTime = `${startTime}:00`; // "HH:mm" -> "HH:mm:00"
    }
  }

  if (endTime && typeof endTime === 'string') {
    const parts = endTime.split(':');
    if (parts.length === 2) {
      endTime = `${endTime}:00`; // "HH:mm" -> "HH:mm:00"
    }
  }

  // Validate that startTime < endTime before sending
  if (startTime && endTime) {
    const startParts = startTime.split(':').map(Number);
    const endParts = endTime.split(':').map(Number);
    const startTotalSeconds = startParts[0] * 3600 + startParts[1] * 60 + (startParts[2] || 0);
    const endTotalSeconds = endParts[0] * 3600 + endParts[1] * 60 + (endParts[2] || 0);
    
    if (startTotalSeconds >= endTotalSeconds) {
      const startHours = startParts[0];
      const startMinutes = startParts[1];
      const endHours = endParts[0];
      const endMinutes = endParts[1];
      
      const start12h = startHours > 12 
        ? `${startHours - 12}:${startMinutes.toString().padStart(2, '0')} PM`
        : startHours === 12 
        ? `12:${startMinutes.toString().padStart(2, '0')} PM`
        : startHours === 0
        ? `12:${startMinutes.toString().padStart(2, '0')} AM`
        : `${startHours}:${startMinutes.toString().padStart(2, '0')} AM`;
        
      const end12h = endHours > 12 
        ? `${endHours - 12}:${endMinutes.toString().padStart(2, '0')} PM`
        : endHours === 12 
        ? `12:${endMinutes.toString().padStart(2, '0')} PM`
        : endHours === 0
        ? `12:${endMinutes.toString().padStart(2, '0')} AM`
        : `${endHours}:${endMinutes.toString().padStart(2, '0')} AM`;
      
      throw new Error(
        `Start time (${start12h}) must be earlier than end time (${end12h}). ` +
        `Please check your time selections.`
      );
    }
    
    const durationMinutes = (endTotalSeconds - startTotalSeconds) / 60;
    if (durationMinutes < 30) {
      throw new Error(`The duration between start and end time must be at least 30 minutes (current: ${durationMinutes.toFixed(0)} minutes)`);
    }
  }

  // Convert to PascalCase to match backend DTO (ItineraryItemCreateDto)
  const formattedData: any = {
    PlaceId: data.placeId, // Backend expects Guid, will parse from string
    DayNumber: data.dayNumber,
    SortOrder: data.sortOrder || 1,
    StartTime: startTime, // Format: "HH:mm:ss"
    EndTime: endTime, // Format: "HH:mm:ss"
    ActivityTitle: data.activityTitle,
    ActivityDescription: data.activityDescription,
    ActivityType: data.activityType,
  };

  console.log('Sending itinerary item data:', JSON.stringify(formattedData, null, 2));

  // Add optional fields in PascalCase
  if (data.estimatedDuration !== undefined && data.estimatedDuration !== null) {
    formattedData.EstimatedDuration = data.estimatedDuration * 60; //Convert minutes to seconds based on database
  }
  if (data.actualDuration !== undefined && data.actualDuration !== null) {
    
    formattedData.ActualDuration = data.actualDuration * 60; //Convert minutes to seconds based on database
  }
  if (data.estimatedCost !== undefined && data.estimatedCost !== null) {
    formattedData.EstimatedCost = data.estimatedCost;
  }
  if (data.actualCost !== undefined && data.actualCost !== null) {
    formattedData.ActualCost = data.actualCost;
  }
  if (data.bookingReference?.trim()) {
    formattedData.BookingReference = data.bookingReference;
  }
  if (data.bookingStatus) {
    formattedData.BookingStatus = data.bookingStatus;
  }
  if (data.transportMethod) {
    formattedData.TransportMethod = data.transportMethod;
  }
  if (data.transportCost !== undefined && data.transportCost !== null) {
    formattedData.TransportCost = data.transportCost;
  }
  if (data.isCompleted !== undefined) {
    formattedData.IsCompleted = data.isCompleted;
  }
  if (data.completionNotes?.trim()) {
    formattedData.CompletionNotes = data.completionNotes;
  }

  // Send data directly, not wrapped in { request: ... }
  const response = await apiClient.post(
    `/api/itinerary/${itineraryId}/add-item`,
    formattedData
  );
  return response.data.data || response.data;
};

export const addItineraryItemsBatch = async (
  itineraryId: string,
  data: CreateItineraryItemRequest[]
): Promise<ItineraryItem[]> => {
  // Format each item to PascalCase and convert time format
  const formattedItems = data.map(item => {
    let startTime = item.startTime;
    let endTime = item.endTime;
    
    // Convert "HH:mm" to "HH:mm:ss" format
    if (startTime && typeof startTime === 'string') {
      const parts = startTime.split(':');
      if (parts.length === 2) {
        startTime = `${startTime}:00`;
      }
    }
    if (endTime && typeof endTime === 'string') {
      const parts = endTime.split(':');
      if (parts.length === 2) {
        endTime = `${endTime}:00`;
      }
    }

    const formatted: any = {
      PlaceId: item.placeId,
      DayNumber: item.dayNumber,
      SortOrder: item.sortOrder || 1,
      StartTime: startTime,
      EndTime: endTime,
      ActivityTitle: item.activityTitle,
      ActivityDescription: item.activityDescription,
      ActivityType: item.activityType,
    };

    // Add optional fields
    if (item.estimatedDuration !== undefined) formatted.EstimatedDuration = item.estimatedDuration*60; //Convert minutes to seconds according to database
    if (item.actualDuration !== undefined) formatted.ActualDuration = item.actualDuration*60; //Convert minutes to seconds according to database
    if (item.estimatedCost !== undefined) formatted.EstimatedCost = item.estimatedCost;
    if (item.actualCost !== undefined) formatted.ActualCost = item.actualCost;
    if (item.bookingReference) formatted.BookingReference = item.bookingReference;
    if (item.bookingStatus) formatted.BookingStatus = item.bookingStatus;
    if (item.transportMethod) formatted.TransportMethod = item.transportMethod;
    if (item.transportCost !== undefined) formatted.TransportCost = item.transportCost;
    if (item.isCompleted !== undefined) formatted.IsCompleted = item.isCompleted;
    if (item.completionNotes) formatted.CompletionNotes = item.completionNotes;

    return formatted;
  });

  const response = await apiClient.post(
    `/api/itinerary/${itineraryId}/add-batch`,
    formattedItems // Backend expects array directly, not wrapped in { request: ... }
  );
  return response.data.data || response.data;
};

export const getItineraryItems = async (
  itineraryId: string
): Promise<ItineraryItem[]> => {
  try {
    const response = await apiClient.get(`/api/itinerary/${itineraryId}/get-all`);
    const responseData = response.data?.data || response.data;
  
  // Transform from API structure: [{ dayNumber, timeGroups: [{ timeSlot, activities: [...] }] }]
  // to flat array: ItineraryItem[]
  const items: ItineraryItem[] = [];
  
  if (Array.isArray(responseData)) {
    responseData.forEach((daySchedule: any) => {
      if (daySchedule.timeGroups && Array.isArray(daySchedule.timeGroups)) {
        daySchedule.timeGroups.forEach((timeGroup: any) => {
          if (timeGroup.activities && Array.isArray(timeGroup.activities)) {
            timeGroup.activities.forEach((activity: any) => {
              // Transform activity to ItineraryItem format
              items.push({
                itemId: activity.itemId,
                itineraryId: activity.itineraryId,
                placeId: activity.placeId,
                place: activity.place, // May be null, will load separately
                dayNumber: activity.dayNumber,
                orderInDay: activity.sortOrder || activity.orderInDay || 0,
                sortOrder: activity.sortOrder,
                timeOfDay: timeGroup.timeSlot as any, // "Morning", "Afternoon", etc.
                startTime: convertUtcToLocalTime(activity.startTime, getTimezoneFromStorage() || 'UTC+00:00'),
                endTime: convertUtcToLocalTime(activity.endTime, getTimezoneFromStorage() || 'UTC+00:00'),
                durationMinutes: calculateDurationMinutes(activity.estimatedDuration, activity.actualDuration, activity.isCompleted),
                estimatedDuration: activity.estimatedDuration,
                actualDuration: activity.actualDuration,
                activityTitle: activity.activityTitle,
                activityDescription: activity.activityDescription,
                activityType: activity.activityType,
                transportMethod: activity.transportMethod as any,
                transportDuration: activity.transportDuration,
                transportCost: activity.transportCost,
                estimatedCost: activity.estimatedCost,
                actualCost: activity.actualCost,
                bookingReference: activity.bookingReference,
                bookingStatus: activity.bookingStatus as any,
                completionNotes: activity.completionNotes,
                isCompleted: activity.isCompleted,
                notes: activity.notes,
              });
            });
          }
        });
      }
    });
  }
  
    return items;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

const calculateDurationMinutes = (estimatedDuration: number, actualDuration: number, isCompleted: boolean): number | undefined => {
  if (isCompleted && actualDuration) {
    return Math.floor(actualDuration / 60);
  }
  if (estimatedDuration) {
    
    return Math.floor(estimatedDuration / 60);
  }
  return undefined;
};

export const updateItineraryItem = async (
  itemId: string,
  data: UpdateItineraryItemRequest
): Promise<ItineraryItem> => {
  // Format times to HH:mm:ss if needed
  let startTime = data.startTime;
  let endTime = data.endTime;
  
  if (startTime && typeof startTime === 'string' && startTime.split(':').length === 2) {
    startTime = `${startTime}:00`;
  }
  if (endTime && typeof endTime === 'string' && endTime.split(':').length === 2) {
    endTime = `${endTime}:00`;
  }

  // Convert to PascalCase to match backend DTO (ItineraryItemUpdateDto)
  const formattedData: any = {
    PlaceId: data.placeId, // Backend expects Guid
    DayNumber: data.dayNumber,
    SortOrder: data.sortOrder || 1,
    StartTime: startTime, // Format: "HH:mm:ss"
    EndTime: endTime, // Format: "HH:mm:ss"
    ActivityTitle: data.activityTitle,
    ActivityDescription: data.activityDescription,
    ActivityType: data.activityType,
  };

  // Add optional fields in PascalCase
  if (data.estimatedDuration !== undefined && data.estimatedDuration !== null) {
    formattedData.EstimatedDuration = data.estimatedDuration * 60; //Convert minutes to seconds according to database
  }
  if (data.estimatedCost !== undefined && data.estimatedCost !== null) {
    formattedData.EstimatedCost = data.estimatedCost;
  }
  if (data.actualDuration !== undefined && data.actualDuration !== null) {
    formattedData.ActualDuration = data.actualDuration * 60; //Convert minutes to seconds according to database
  }
  if (data.actualCost !== undefined && data.actualCost !== null) {
    formattedData.ActualCost = data.actualCost;
  }
  if (data.bookingReference?.trim()) {
    formattedData.BookingReference = data.bookingReference;
  }
  if (data.bookingStatus) {
    formattedData.BookingStatus = data.bookingStatus;
  }
  if (data.transportMethod) {
    formattedData.TransportMethod = data.transportMethod;
  }
  if (data.transportCost !== undefined && data.transportCost !== null) {
    formattedData.TransportCost = data.transportCost;
  }
  if (data.isCompleted !== undefined) {
    formattedData.IsCompleted = data.isCompleted;
  }
  if (data.completionNotes?.trim()) {
    formattedData.CompletionNotes = data.completionNotes;
  }

  // Backend expects direct DTO, not wrapped in { request: ... }
  const response = await apiClient.put(`/api/itinerary/update/${itemId}`, formattedData);
  return response.data.data || response.data;
};

export const deleteItineraryItem = async (itemId: string): Promise<void> => {
  await apiClient.delete(`/api/itinerary/delete/${itemId}`);
};

export const reorderItineraryItems = async (
  itineraryId: string,
  data: ReorderItemsBatchRequest
): Promise<void> => {
  await apiClient.patch(`/api/itinerary/${itineraryId}/reorder`, { request: data.items });
};

// ============ TEMPLATES ============
export const getPublicTemplates = async (
  params?: SearchItineraryParams
): Promise<PaginatedResponse<Itinerary>> => {
  const fallback = { page: params?.Page ?? 1, pageSize: params?.PageSize ?? 20, totalItems: 0, items: [] };
  try {
    const response = await apiClient.get("/api/itinerary-templates", { 
      params: params || { Page: 1, PageSize: 20 }
    });
    const raw = response.data?.data;
    const page = params?.Page ?? 1;
    const pageSize = params?.PageSize ?? 20;
    if (!raw) {
      return { page, pageSize, totalItems: 0, items: [] };
    }
    if (Array.isArray(raw)) {
      return { page, pageSize, totalItems: raw.length, items: raw };
    }
    return raw;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return fallback;
    }
    throw error;
  }
};

export const getMyTemplates = async (
  params?: SearchItineraryParams
): Promise<PaginatedResponse<Itinerary>> => {
  const fallback = { page: params?.Page ?? 1, pageSize: params?.PageSize ?? 20, totalItems: 0, items: [] };
  try {
    const response = await apiClient.get("/api/itinerary-templates/my", {
      params: params || { Page: 1, PageSize: 20 }
    });
    const raw = response.data?.data;
    const page = params?.Page ?? 1;
    const pageSize = params?.PageSize ?? 20;
    if (!raw) {
      return { page, pageSize, totalItems: 0, items: [] };
    }
    if (Array.isArray(raw)) {
      return { page, pageSize, totalItems: raw.length, items: raw };
    }
    return raw;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return fallback;
    }
    throw error;
  }
};

export const useTemplate = async (templateId: string): Promise<Itinerary> => {
  const response = await apiClient.post(
    `/api/itinerary/templates/${templateId}/use`
  );
  // Check if API returns wrapped format
  return response.data.data || response.data;
};

export const saveAsTemplate = async (itineraryId: string): Promise<Itinerary> => {
  const response = await apiClient.post(
    `/api/itinerary/${itineraryId}/save-as-template`
  );
  // Check if API returns wrapped format
  return response.data.data || response.data;
};

// ============ SHARING ============
export const shareItinerary = async (
  itineraryId: string,
  data: ShareItineraryRequest
): Promise<ItineraryShare> => {
  const response = await apiClient.post(
    `/api/itinerary/${itineraryId}/share`,
    data
  );
  return response.data;
};

export const getItineraryShares = async (
  itineraryId: string
): Promise<ItineraryShare[]> => {
  const response = await apiClient.get(`/api/itinerary/${itineraryId}/shares`);
  return response.data.data;
};

export const revokeShare = async (shareId: string): Promise<void> => {
  console.log("Revoking share with ID (service):", shareId);
  await apiClient.delete(`/api/itinerary/shares/${shareId}`);
};

export const getSharedWithMe = async (): Promise<Itinerary[]> => {
  const response = await apiClient.get("/api/itinerary/shared-with-me");
  const data = response.data.data || response.data;
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  
  // API returns share metadata, not full itinerary data
  // We need to fetch full itinerary detail for each shared itinerary
  const itineraryPromises = data
    .map((shareItem: any) => {
      const itineraryId = shareItem.itineraryId || shareItem.ItineraryId;
      if (!itineraryId) {
        console.warn('Share item missing itineraryId:', shareItem);
        return null;
      }
      return getItineraryById(itineraryId);
    })
    .filter((promise): promise is Promise<Itinerary | null> => promise !== null);
  
  // Fetch all itineraries in parallel
  const itineraries = await Promise.all(itineraryPromises);
  
  // Filter out null results and normalize dates
  const validItineraries = itineraries
    .filter((itinerary): itinerary is Itinerary => itinerary !== null)
    .map((itinerary) => ({
      ...itinerary,
      startDate: normalizeDate(itinerary.startDate) || itinerary.startDate,
      endDate: normalizeDate(itinerary.endDate) || itinerary.endDate,
      createdAt: normalizeDate(itinerary.createdAt) || itinerary.createdAt,
      updatedAt: itinerary.updatedAt ? normalizeDate(itinerary.updatedAt) : itinerary.updatedAt,
      completedAt: itinerary.completedAt ? normalizeDate(itinerary.completedAt) : itinerary.completedAt,
    }));
  
  return validItineraries;
};

// ============ EXPORT ============
export const exportToPDF = async (itineraryId: string): Promise<Blob> => {
  const response = await apiClient.get(
    `/api/export-to-pdf/${itineraryId}`,
    {
      responseType: "blob",
    }
  );
  return response.data;
};

export const exportToICal = async (itineraryId: string): Promise<Blob> => {
  const response = await apiClient.get(
    `/api/itinerary/${itineraryId}/export/ical`,
    {
      responseType: "blob",
    }
  );
  return response.data;
};

export const exportToJSON = async (itineraryId: string): Promise<string> => {
  const response = await apiClient.get(
    `/api/itinerary/${itineraryId}/export/json`
  );
  return response.data;
};

// ============ ROUTE OPTIMIZATION ============
/**
 * Calculate distance matrix between each leg of the itinerary
 * @param itineraryId - ID of the itinerary
 * @param transportMethod - Transport method (Driving, Walking, etc.)
 * @returns Distance calculation with distances between each leg
 */
export const calculateDistanceMatrix = async (
  itineraryId: string,
  transportMethod: string = "Driving"
): Promise<any> => {
  const response = await apiClient.get(
    `/distance-matrix-itinerary/${itineraryId}`,
    { params: { transportMethod } }
  );
  return response.data.data || response.data;
};

/**
 * Calculate detailed route for the itinerary
 * @param itineraryId - ID of the itinerary
 * @returns Detailed route information for each leg
 */
export const calculateRouteFromItinerary = async (
  itineraryId: string
): Promise<any> => {
  const response = await apiClient.get(
    `/route-itinerary/${itineraryId}`
  );
  return response.data.data || response.data;
};

/**
 * Optimize route for the itinerary (only supports Driving transport method)
 * @param itineraryId - ID of the itinerary
 * @returns Optimized route with reordered items
 */
export const optimizeRouteFromItinerary = async (
  itineraryId: string
): Promise<RouteOptimizationResult> => {
  const response = await apiClient.get(
    `/optimize-route/${itineraryId}`
  );
  return response.data.data || response.data;
};

// Legacy functions (kept for backward compatibility)
export const calculateDistance = async (
  itineraryId: string
): Promise<DistanceCalculation> => {
  // Use new endpoint
  const result = await calculateDistanceMatrix(itineraryId, "Driving");
  // Transform to DistanceCalculation format if needed
  return result as any;
};

export const optimizeRoute = async (
  itineraryId: string
): Promise<RouteOptimizationResult> => {
  // Use new endpoint
  return await optimizeRouteFromItinerary(itineraryId);
};

export const getRouteSuggestions = async (
  itineraryId: string
): Promise<string[]> => {
  // This endpoint may not exist, return empty array for now
  try {
    const response = await apiClient.get(
      `/api/calculate/itinerary/${itineraryId}/suggestions`
    );
    return response.data.data || response.data || [];
  } catch {
    return [];
  }
};

// ============ ANALYTICS ============
export const getUserStatistics = async (): Promise<UserStatistics> => {
  const response = await apiClient.get("/api/itinerary/user-statistics");
  return response.data.data; // API returns { success, message, statusCode, data, errors }
};

export const getItineraryStatistics = async (
  itineraryId: string
): Promise<ItineraryStatistics> => {
  const response = await apiClient.get(
    `/api/itinerary/${itineraryId}/itinerary-statistics`
  );
  return response.data.data; // API returns { success, message, statusCode, data, errors }
};

// ============ AI IMAGE GENERATION ============
/**
 * Generate cover image for itinerary using AI
 * @param data - Itinerary data to generate image from
 * @returns Promise<string> - Secure URL of generated and uploaded image
 */
export const generateItineraryCoverImage = async (data: {
  title: string;
  description?: string;
  tripType?: string;
  destinationCity?: string;
  destinationCountry?: string;
}): Promise<string> => {
  try {
    const response = await apiClient.post("/api/itinerary/generate-cover-image", data);
    return response.data.data; // API returns { success, message, statusCode, data }
  } catch (error: any) {
    console.error("Failed to generate cover image:", error);
    throw new Error(
      error.response?.data?.message || error.message || "Failed to generate cover image. Please try again."
    );
  }
};

// ============ CLOUDINARY HELPERS ============
/**
 * Upload itinerary cover image to Cloudinary and return the URL
 * @param file - Image file to upload
 * @returns Promise<string> - Secure URL of uploaded image
 */
export const uploadItineraryCoverImage = async (
  file: File
): Promise<string> => {
  try {
    if (!file) {
      throw new Error("No file provided");
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are allowed");
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error("Image size must be less than 10MB");
    }

    // Upload to Cloudinary with folder 'itineraries'
    const result = await uploadToCloudinary(file, {
      folder: "itineraries",
    });

    return result.secure_url;
  } catch (error: any) {
    console.error("Failed to upload itinerary cover image:", error);
    throw new Error(
      error.message || "Failed to upload cover image. Please try again."
    );
  }
};

