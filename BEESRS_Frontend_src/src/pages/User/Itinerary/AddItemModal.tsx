import { useState, useEffect } from "react";
import {
  X,
  Search,
  MapPin,
  DollarSign,
  Navigation,
  Calendar,
  FileText,
  ChevronDown,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Card } from "../../../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { useToast } from "../../../components/ui/use-toast";
import type {
  CreateItineraryItemRequest,
  Place,
  ItineraryItem,
} from "../../../types/itinerary.types";
import { addItineraryItem, getItineraryItems } from "../../../services/itineraryService";
import { placeService } from "../../../services/placeService";
import { getCurrentUser, ViewDetailPlace } from "../../../services/userService";
import { branchService } from "../../../services/branchService";
import { convertLocalTimeToUtc, convertUtcToLocalTime, getTimezoneFromStorage } from "../../../utils/timezone";

interface AddItemModalProps {
  itineraryId: string;
  totalDays: number;
  selectedDay?: number; // Day that is currently selected in the parent component
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddItemModal({
  itineraryId,
  totalDays,
  selectedDay,
  onClose,
  onSuccess,
}: AddItemModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [allPlaces, setAllPlaces] = useState<Place[]>([]); // All places from branch
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [branchCity, setBranchCity] = useState<string | null>(null);
  const [branchCountry, setBranchCountry] = useState<string | null>(null);
  const [loadingBranch, setLoadingBranch] = useState(true);
  const [existingItems, setExistingItems] = useState<ItineraryItem[]>([]); // Existing items to check conflicts
  const [placeDetail, setPlaceDetail] = useState<any>(null); // Place detail with busyTime
  const [loadingPlaceDetail, setLoadingPlaceDetail] = useState(false);

  const [formData, setFormData] = useState<CreateItineraryItemRequest>({
    placeId: "",
    dayNumber: 1,
    sortOrder: 1,
    startTime: "",
    endTime: "", // Will be calculated from startTime + estimatedDuration
    estimatedDuration: undefined,
    actualDuration: undefined,
    activityTitle: "",
    activityDescription: "",
    activityType: "",
    estimatedCost: undefined,
    actualCost: undefined,
    bookingReference: "",
    bookingStatus: "NotBooked",
    transportMethod: undefined,
    transportCost: undefined,
    isCompleted: false,
    completionNotes: "",
  });

  // Load existing items to check for conflicts
  useEffect(() => {
    let isMounted = true;
    const loadExistingItems = async () => {
      try {
        const items = await getItineraryItems(itineraryId);
        if (isMounted) {
          setExistingItems(items);
        }
      } catch (error) {
        console.error("Failed to load existing items:", error);
        // Continue even if fails
      }
    };
    loadExistingItems();
    return () => {
      isMounted = false;
    };
  }, [itineraryId]);

  // Load current branch info on mount (only once)
  useEffect(() => {
    let isMounted = true;
    const loadBranchInfo = async () => {
      setLoadingBranch(true);
      try {
        const user = await getCurrentUser().catch(() => null);
        if (!isMounted) return;
        
        if (!user) {
          if (isMounted) {
            toast({
              title: "Error",
              description: "Failed to load user information",
              variant: "destructive",
            });
          }
          return;
        }

        // Get current branch ID from user
        const currentBranchId = (user as any).currentBranchId || (user as any).CurrentBranchId;
        
        if (currentBranchId && currentBranchId !== '00000000-0000-0000-0000-000000000000') {
          // Get branch details
          const branch = await branchService.getBranchById(currentBranchId);
          if (!isMounted) return;
          
          if (branch && branch.countryName && branch.cityName) {
            setBranchCountry(branch.countryName);
            setBranchCity(branch.cityName);
          } else {
            // Fallback to CurrentLocation if branch doesn't have country/city
            setBranchCountry(user?.profile?.CurrentLocationCountry || null);
            setBranchCity(user?.profile?.CurrentLocationCity || null);
          }
        } else {
          // Fallback to CurrentLocation if no branch
          setBranchCountry(user?.profile?.CurrentLocationCountry || null);
          setBranchCity(user?.profile?.CurrentLocationCity || null);
        }
      } catch (error: any) {
        if (isMounted) {
          console.error('Failed to load branch info:', error);
          toast({
            title: "Error",
            description: "Failed to load branch information. Please refresh the page.",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setLoadingBranch(false);
        }
      }
    };
    
    loadBranchInfo();
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Load all places from branch when branch info is loaded
  useEffect(() => {
    if (loadingBranch) {
      return;
    }

    let isMounted = true;
    const loadPlacesFromBranch = async () => {
      setLoadingPlaces(true);
      try {
        // Call API to get all places from user's current branch
        const response = await placeService.getPlacesByBranch(1, 100);
        
        if (!isMounted) return;

        // Transform API response to Place format
        // API returns: { page, pageSize, totalItems, items: [{ placeDetail: {...}, reviews: [...] }] }
        const responseData = response.data || response;
        const items = responseData.items || responseData || [];
        
        console.log('Places response:', responseData);
        console.log('Items count:', items.length);
        
        const places: Place[] = items.map((item: any) => {
          // Each item has structure: { placeDetail: {...}, reviews: [...] }
          const placeDetail = item.placeDetail || item.PlaceDetail || item;
          
          // Get first image URL from imageUrls array
          const firstImage = placeDetail.imageUrls && placeDetail.imageUrls.length > 0 
            ? placeDetail.imageUrls[0].imageUrl || placeDetail.imageUrls[0].ImageUrl
            : '';
          
          return {
            placeId: placeDetail.placeId || placeDetail.PlaceId || '',
            placeName: placeDetail.name || placeDetail.Name || '',
            address: placeDetail.addressLine1 || placeDetail.AddressLine1 || placeDetail.address || '',
            latitude: placeDetail.latitude || placeDetail.Latitude || 0,
            longitude: placeDetail.longitude || placeDetail.Longitude || 0,
            imageUrl: firstImage || placeDetail.imageUrl || placeDetail.ImageUrl || '',
            description: placeDetail.description || placeDetail.Description || placeDetail.categoryName || placeDetail.CategoryName || '',
          };
        });
        
        console.log('Transformed places:', places);

        if (isMounted) {
          setAllPlaces(places);
          // Show all places initially if no search query
          if (!searchQuery.trim()) {
            setSearchResults(places);
          }
        }
      } catch (error: any) {
        if (!isMounted) return;
        
        console.error('Error loading places from branch:', error);
        // Don't show error toast for 404 (no places found)
        if (error.response?.status !== 404 && error.response?.status !== 400) {
          toast({
            title: "Error",
            description: error.response?.data?.message || error.message || "Failed to load places. Please try again.",
            variant: "destructive",
          });
        }
        setAllPlaces([]);
        setSearchResults([]);
      } finally {
        if (isMounted) {
          setLoadingPlaces(false);
        }
      }
    };

    loadPlacesFromBranch();
    return () => {
      isMounted = false;
    };
  }, [loadingBranch]); // Load when branch info is loaded

  // Filter places based on search query (client-side filtering)
  useEffect(() => {
    if (!searchQuery.trim()) {
      // Show all places if no search query
      setSearchResults(allPlaces);
      setSearching(false);
      return;
    }

    setSearching(true);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      const queryLower = searchQuery.toLowerCase().trim();
      const filtered = allPlaces.filter((place) => {
        const nameMatch = place.placeName?.toLowerCase().includes(queryLower);
        const addressMatch = place.address?.toLowerCase().includes(queryLower);
        const descMatch = place.description?.toLowerCase().includes(queryLower);
        return nameMatch || addressMatch || descMatch;
      });
      setSearchResults(filtered);
      setSearching(false);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      setSearching(false);
    };
  }, [searchQuery, allPlaces]);

  const handleSelectPlace = async (place: Place) => {
    setSelectedPlace(place);
    setFormData({ ...formData, placeId: place.placeId });
    
    // Load place detail to get busyTime
    setLoadingPlaceDetail(true);
    try {
      const detail = await ViewDetailPlace({ placeId: place.placeId });
      setPlaceDetail(detail);
      
      // Auto-fill activity title with place name if empty
      if (!formData.activityTitle) {
        setFormData({ ...formData, placeId: place.placeId, activityTitle: detail.name || "" });
      }
    } catch (error) {
      console.error("Failed to load place detail:", error);
      setPlaceDetail(null);
    } finally {
      setLoadingPlaceDetail(false);
    }
  };

  // Calculate endTime from startTime + estimatedDuration
  // Extra: Use actualDuration when the this Itinerary Items is completed
  useEffect(() => {
    if (formData.startTime && (formData.estimatedDuration || formData.actualDuration)) {
      
      let endTime : string = calculateEstimatedEndTime(formData.startTime, formData.estimatedDuration ?? 0 );

      if(formData.isCompleted && formData.actualDuration){
        endTime = calculateActualEndTime(formData.startTime, formData.actualDuration);
      }
      
      // Only update if endTime changed to avoid infinite loop
      if (formData.endTime !== endTime) {
        setFormData(prev => ({ ...prev, endTime }));
      }
    } else if (!formData.startTime || !formData.estimatedDuration) {
      // Clear endTime if startTime or duration is missing
      if (formData.endTime) {
        setFormData(prev => ({ ...prev, endTime: "" }));
      }
    }
  }, [formData.startTime, formData.estimatedDuration, formData.actualDuration, formData.isCompleted]);

  // Set default dayNumber to selectedDay when modal opens or selectedDay changes
  useEffect(() => {
    if (selectedDay && selectedDay >= 1 && selectedDay <= totalDays) {
      setFormData(prev => ({ ...prev, dayNumber: selectedDay }));
    }
  }, [selectedDay, totalDays]);

  // Auto-calculate sortOrder when dayNumber changes (based on count of items in day)
  useEffect(() => {
    if (formData.dayNumber) {
      const autoSortOrder = calculateSortOrder(formData.dayNumber);
      if (formData.sortOrder !== autoSortOrder) {
        setFormData(prev => ({ ...prev, sortOrder: autoSortOrder }));
      }
    }
  }, [formData.dayNumber, existingItems]);


  const calculateActualEndTime = (startTime: string, actualDuration: number): string => {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + actualDuration;
      const endHours = Math.floor(endMinutes / 60) % 24; // Handle overflow to next day
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      return endTime; 
  };

  const calculateEstimatedEndTime = (startTime: string, estimatedDuration: number): string => {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + estimatedDuration;
      const endHours = Math.floor(endMinutes / 60) % 24; // Handle overflow to next day
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      return endTime;
  };

  // Helper function to parse time string to minutes
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Helper functions to convert between 24h and 12h format
  const convert24hTo12h = (time24h: string) => {
    if (!time24h) return { hour: '12', minute: '00', period: 'AM' }
    const [hours, minutes] = time24h.split(':')
    const hour24 = parseInt(hours || '0', 10)
    if (isNaN(hour24)) return { hour: '12', minute: '00', period: 'AM' }
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const period = hour24 >= 12 ? 'PM' : 'AM'
    const minuteValue = (minutes || '00').padStart(2, '0')
    return {
      hour: hour12.toString().padStart(2, '0'),
      minute: minuteValue,
      period
    }
  }

  const convert12hTo24h = (hour: string, minute: string, period: string) => {
    let hour24 = parseInt(hour || '12', 10)
    if (isNaN(hour24)) hour24 = 12
    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0
    }
    const minuteValue = (minute || '00').padStart(2, '0')
    return `${hour24.toString().padStart(2, '0')}:${minuteValue}`
  }

  // Handler for startTime hour change
  const handleStartTimeHourChange = (hour: string) => {
    const time12h = convert24hTo12h(formData.startTime || '')
    const time24h = convert12hTo24h(hour, time12h.minute, time12h.period)
    setFormData({ ...formData, startTime: time24h })
  }

  // Handler for startTime minute change
  const handleStartTimeMinuteChange = (minute: string) => {
    const time12h = convert24hTo12h(formData.startTime || '')
    const time24h = convert12hTo24h(time12h.hour, minute, time12h.period)
    setFormData({ ...formData, startTime: time24h })
  }

  // Handler for startTime period change
  const handleStartTimePeriodChange = (period: string) => {
    const time12h = convert24hTo12h(formData.startTime || '')
    const time24h = convert12hTo24h(time12h.hour, time12h.minute, period)
    setFormData({ ...formData, startTime: time24h })
  }

  // Calculate TimeSlot based on StartTime and EndTime (same logic as backend)
  const getTimeSlotType = (startTime: string, endTime: string): string => {
    const [startHours, startMins, startSecs = 0] = startTime.split(':').map(Number);
    const [endHours, endMins, endSecs = 0] = endTime.split(':').map(Number);
    
    // Convert to total seconds (more precise like TimeSpan)
    const startTotalSeconds = startHours * 3600 + startMins * 60 + startSecs;
    let endTotalSeconds = endHours * 3600 + endMins * 60 + endSecs;
    
    // Handle midnight wrap-around (if endTime < startTime, add 24 hours)
    if (endTotalSeconds < startTotalSeconds) {
      endTotalSeconds += 24 * 3600; // Add 24 hours in seconds
    }
    
    // Calculate midpoint in seconds
    const duration = endTotalSeconds - startTotalSeconds;
    const midpointSeconds = startTotalSeconds + duration / 2;
    
    // Wrap around if midpoint >= 24 hours
    let midpointHours = (midpointSeconds % (24 * 3600)) / 3600;
    
    // Determine TimeSlot based on midpoint (same ranges as backend)
    // Morning: 5 AM - 12 PM (5 <= x < 12)
    if (midpointHours >= 5 && midpointHours < 12) {
      return "Morning";
    }
    // Noon: 12 PM - 1 PM (12 <= x < 13)
    if (midpointHours >= 12 && midpointHours < 13) {
      return "Noon";
    }
    // Afternoon: 1 PM - 4 PM (13 <= x < 16)
    if (midpointHours >= 13 && midpointHours < 16) {
      return "Afternoon";
    }
    // Evening: 4 PM - 9 PM (16 <= x < 21)
    if (midpointHours >= 16 && midpointHours < 21) {
      return "Evening";
    }
    // Night: 9 PM - 5 AM (covers rest)
    return "Night";
  };

  // Auto-calculate sortOrder based on count of items in the same Day
  const calculateSortOrder = (dayNumber: number): number => {
    // Count all items in the same day
    const dayItems = existingItems.filter(item => item.dayNumber === dayNumber);
    
    // Return count + 1 (next order number)
    return dayItems.length + 1;
  };

  // Check if current sortOrder conflicts with existing items in the same day
  const checkSortOrderConflict = (dayNumber: number, sortOrder: number): string | null => {
    if (!sortOrder) return null;
    
    // Find items with same day and sortOrder
    const conflictingItems = existingItems.filter(item => {
      if (item.dayNumber !== dayNumber) return false;
      const itemSortOrder = item.sortOrder || item.orderInDay || 1;
      return itemSortOrder === sortOrder;
    });
    
    if (conflictingItems.length > 0) {
      return `Order ${sortOrder} is already used in Day ${dayNumber}. Please choose a different order.`;
    }
    
    return null;
  };

  // Helper function to parse busyTime range (e.g., "12:00-16:00")
  const parseBusyTime = (busyTimeStr: string | null | undefined): { start: number; end: number } | null => {
    if (!busyTimeStr) return null;
    const parts = busyTimeStr.split('-');
    if (parts.length !== 2) return null;
    const start = timeToMinutes(parts[0].trim());
    const end = timeToMinutes(parts[1].trim());
    return { start, end };
  };

  // Check if time overlaps with existing items
  const checkTimeConflict = (startTime: string, endTime: string, dayNumber: number): string | null => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    // Check for overlaps with existing items on the same day
    for (const item of existingItems) {
      if (item.dayNumber === dayNumber && item.startTime && item.endTime) {
        const itemStart = timeToMinutes(item.startTime);
        const itemEnd = timeToMinutes(item.endTime);
        
        // Check if times overlap
        if (startMinutes < itemEnd && endMinutes > itemStart) {
          return `Time conflicts with existing activity: ${item.startTime} - ${item.endTime}`;
        }
      }
    }
    return null;
  };

  // Check if time is at least 1 hour after previous item
  const checkMinimumGap = (startTime: string, dayNumber: number): { error: string | null; suggestedTime: string | null } => {
    const startMinutes = timeToMinutes(startTime);
    
    // Find the last item on the same day
    const dayItems = existingItems
      .filter(item => item.dayNumber === dayNumber && item.endTime)
      .sort((a, b) => {
        const aEnd = timeToMinutes(a.endTime!);
        const bEnd = timeToMinutes(b.endTime!);
        return bEnd - aEnd; // Sort descending
      });
    
    if (dayItems.length > 0) {
      const lastItem = dayItems[0];
      const lastItemEnd = timeToMinutes(lastItem.endTime!);
      const gapMinutes = startMinutes - lastItemEnd;
      
      if (gapMinutes < 60) {
        // Calculate suggested start time (1 hour after last item ends)
        const suggestedEndMinutes = lastItemEnd + 60;
        const suggestedHours = Math.floor(suggestedEndMinutes / 60) % 24;
        const suggestedMins = suggestedEndMinutes % 60;
        const suggestedTime = `${suggestedHours.toString().padStart(2, '0')}:${suggestedMins.toString().padStart(2, '0')}`;
        
        // Format suggested time in 12-hour format for display
        const format12Hour = (timeStr: string) => {
          const [h, m] = timeStr.split(':').map(Number);
          if (h === 0) return `12:${m.toString().padStart(2, '0')} AM`;
          if (h < 12) return `${h}:${m.toString().padStart(2, '0')} AM`;
          if (h === 12) return `12:${m.toString().padStart(2, '0')} PM`;
          return `${h - 12}:${m.toString().padStart(2, '0')} PM`;
        };
        
        return {
          error: `Start time must be at least 1 hour after the previous activity to allow travel time. Current gap: ${gapMinutes} minutes. Please start from ${format12Hour(suggestedTime)} onwards (after ${lastItem.endTime?.split(':').slice(0, 2).join(':')}).`,
          suggestedTime: suggestedTime
        };
      }
    }
    return { error: null, suggestedTime: null };
  };

  // Check if time is within place's busyTime
  const checkBusyTime = (startTime: string, endTime: string): string | null => {
    if (!placeDetail?.busyTime) return null; // No busyTime means no restriction
    
    const busyTimeRange = parseBusyTime(placeDetail.busyTime);
    if (!busyTimeRange) return null; // Invalid format, skip validation
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    // Check if activity time overlaps with busyTime
    if (startMinutes < busyTimeRange.end && endMinutes > busyTimeRange.start) {
      return `This time overlaps with place's busy time (${placeDetail.busyTime}). Please choose a different time.`;
    }
    
    return null;
  };

  // Check if time is within place's OpenTime and CloseTime
  const checkPlaceOperatingHours = (startTime: string, endTime: string): string | null => {
    // If OpenTime or CloseTime is null, no restriction (chọn thoải mái)
    if (!placeDetail?.openTime || !placeDetail?.closeTime) {
      return null;
    }
    
    // Parse OpenTime and CloseTime (format: "HH:mm:ss" or "HH:mm")
    const parseTimeString = (timeStr: string): number => {
      const parts = timeStr.split(':');
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      return hours * 60 + minutes;
    };
    
    // Convert UTC times from backend to local timezone for comparison
    const timezone = localStorage.getItem('timezone');
    const localOpenTime = convertUtcToLocalTime(placeDetail.openTime, timezone);
    const localCloseTime = convertUtcToLocalTime(placeDetail.closeTime, timezone);
    const openMinutes = parseTimeString(localOpenTime);
    const closeMinutes = parseTimeString(localCloseTime);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    // Handle case where CloseTime < OpenTime (e.g., 22:00 - 02:00 next day)
    if (closeMinutes < openMinutes) {
      // Place is open across midnight (e.g., 22:00 - 02:00)
      // Valid if activity is completely within the operating hours
      // Case 1: Activity starts and ends before midnight (22:00 <= startTime < endTime <= 24:00)
      // Case 2: Activity starts and ends after midnight (00:00 <= startTime < endTime <= 02:00)
      // Case 3: Activity spans midnight (startTime >= 22:00 AND endTime <= 02:00, where endTime is next day)
      const midnight = 24 * 60;
      const isWithinHours = 
        (startMinutes >= openMinutes && endMinutes <= midnight && endMinutes > startMinutes) || // Case 1: Both before midnight
        (startMinutes >= 0 && endMinutes <= closeMinutes && endMinutes > startMinutes) || // Case 2: Both after midnight
        (startMinutes >= openMinutes && endMinutes <= closeMinutes && startMinutes > endMinutes); // Case 3: Spans midnight (start > end means next day)
      
      if (!isWithinHours) {
        const timezone = localStorage.getItem('timezone');
        const localOpenTime = convertUtcToLocalTime(placeDetail.openTime, timezone);
        const localCloseTime = convertUtcToLocalTime(placeDetail.closeTime, timezone);
        return `Activity time must be within place operating hours (${localOpenTime} - ${localCloseTime}).`;
      }
    } else {
      // Normal case: openTime < closeTime (e.g., 09:00 - 17:00)
      // Both startTime and endTime must be within [openTime, closeTime]
      if (startMinutes < openMinutes || endMinutes > closeMinutes) {
        const timezone = localStorage.getItem('timezone');
        const localOpenTime = convertUtcToLocalTime(placeDetail.openTime, timezone);
        const localCloseTime = convertUtcToLocalTime(placeDetail.closeTime, timezone);
        return `Activity time must be within place operating hours (${localOpenTime} - ${localCloseTime}).`;
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const errors: string[] = [];
    
    if (!selectedPlace || !formData.placeId || formData.placeId.trim() === '') {
      errors.push("Please select a place");
    }
    
    if (!formData.dayNumber || formData.dayNumber < 1 || formData.dayNumber > 30) {
      errors.push("Day Number must be between 1 and 30");
    }
    
    if (!formData.startTime || formData.startTime.trim() === '') {
      errors.push("Start time is required");
    }
    
    if (!formData.estimatedDuration || formData.estimatedDuration < 30) {
      errors.push("Estimated duration is required and must be at least 30 minutes");
    }
    
    // Calculate endTime if not set
    if (formData.startTime && formData.estimatedDuration && !formData.endTime) {
      const [hours, minutes] = formData.startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + formData.estimatedDuration;
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      setFormData({ ...formData, endTime });
    }
    
    if (!formData.endTime || formData.endTime.trim() === '') {
      errors.push("End time is required (calculated from start time + duration)");
    }
    
    if (!formData.activityTitle || formData.activityTitle.trim() === '') {
      errors.push("Activity Title is required");
    }
    
    if (!formData.activityDescription || formData.activityDescription.trim() === '') {
      errors.push("Activity Description is required");
    }
    
    if (!formData.activityType || formData.activityType.trim() === '') {
      errors.push("Activity Type is required");
    }

    // Time validations
    if (formData.startTime && formData.endTime && formData.dayNumber) {
      // Check time conflict
      const conflictError = checkTimeConflict(formData.startTime, formData.endTime, formData.dayNumber);
      if (conflictError) {
        errors.push(conflictError);
      }
      
      // Check minimum gap (1 hour after previous item)
      const gapResult = checkMinimumGap(formData.startTime, formData.dayNumber);
      if (gapResult.error) {
        errors.push(gapResult.error);
      }
      
      // Check busyTime
      const busyTimeError = checkBusyTime(formData.startTime, formData.endTime);
      if (busyTimeError) {
        errors.push(busyTimeError);
      }
      
      // Check place operating hours (OpenTime - CloseTime)
      const operatingHoursError = checkPlaceOperatingHours(formData.startTime, formData.endTime);
      if (operatingHoursError) {
        errors.push(operatingHoursError);
      }
      
      // Check sortOrder conflict (only check if manually changed, auto-calculated should be safe)
      const sortOrderError = checkSortOrderConflict(
        formData.dayNumber,
        formData.sortOrder || 1
      );
      if (sortOrderError) {
        errors.push(sortOrderError);
      }
    }

    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(". "),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {

      // Get timezone from localStorage
      const timezone = getTimezoneFromStorage();

      console.log('get timezone from localStorage:', timezone);

      //Convert startTime and endTime to UTC before sending to backend
      const utcStartTime = convertLocalTimeToUtc(formData.startTime!, timezone || 'UTC+00:00');
      const utcEndTime = convertLocalTimeToUtc(formData.endTime!, timezone || 'UTC+00:00');

      console.log('Converted UTC times when creating Items:', {
        utcStartTime,
        utcEndTime,
      });
      // Prepare data with all required fields (already validated above)
      const cleanedData: any = {
        placeId: formData.placeId!,
        dayNumber: formData.dayNumber,
        sortOrder: formData.sortOrder || 1,
        startTime: utcStartTime, // Required - already validated
        endTime: utcEndTime, // Required - already validated
        activityTitle: formData.activityTitle!.trim(), // Required - already validated
        activityDescription: formData.activityDescription!.trim(), // Required - already validated
        activityType: formData.activityType!.trim(), // Required - already validated
      };

      // Add optional fields only if they have values
      if (formData.estimatedDuration) cleanedData.estimatedDuration = formData.estimatedDuration;
      if (formData.actualDuration !== undefined && formData.actualDuration !== null) cleanedData.actualDuration = formData.actualDuration;
      if (formData.estimatedCost !== undefined && formData.estimatedCost !== null) cleanedData.estimatedCost = formData.estimatedCost;
      if (formData.actualCost !== undefined && formData.actualCost !== null) cleanedData.actualCost = formData.actualCost;
      if (formData.bookingReference?.trim()) cleanedData.bookingReference = formData.bookingReference;
      if (formData.bookingStatus) cleanedData.bookingStatus = formData.bookingStatus;
      if (formData.transportMethod) cleanedData.transportMethod = formData.transportMethod;
      if (formData.transportCost !== undefined && formData.transportCost !== null) cleanedData.transportCost = formData.transportCost;
      if (formData.isCompleted !== undefined) cleanedData.isCompleted = formData.isCompleted;
      if (formData.completionNotes?.trim()) cleanedData.completionNotes = formData.completionNotes;

      console.log('Raw form data before sending:', {
        startTime: formData.startTime,
        endTime: formData.endTime,
        startTimeType: typeof formData.startTime,
        endTimeType: typeof formData.endTime,
      });
      console.log('Cleaned data being sent:', cleanedData); // Debug log

      await addItineraryItem(itineraryId, cleanedData);
      toast({
        title: "Success",
        description: "Place added to itinerary",
      });
      onSuccess();
    } catch (error: any) {
      console.error("Failed to add item:", error);
      console.error("Error response:", error?.response?.data);
      
      let errorMessage = "Failed to add place. Please check all required fields.";
      
      if (error?.message) {
        // Frontend validation error
        errorMessage = error.message;
      } else if (error?.response?.data?.errors) {
        // Backend validation errors
        const errors = error.response.data.errors;
        const errorList = Object.entries(errors)
          .map(([key, value]: [string, any]) => {
            if (Array.isArray(value)) {
              return value.join(', ');
            }
            return `${key}: ${value}`;
          })
          .join('. ');
        errorMessage = errorList || errorMessage;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const transportMethods = [
    "Walking",
    "Driving",
    "PublicTransport",
    "Bicycle",
    "Flight",
  ];
  const bookingStatuses = [
    "NotBooked",
    "Pending",
    "Confirmed",
    "Cancelled",
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto pt-0">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-[100]">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Add Place</h2>
            <p className="text-gray-600">
              Search and add a place to your itinerary
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Search Places */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Search Places
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder={branchCity && branchCountry 
                  ? `Search places in ${branchCity}, ${branchCountry}...`
                  : "Search for places..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                disabled={!branchCity || !branchCountry || loadingBranch}
              />
            </div>
            {loadingBranch ? (
              <p className="mt-2 text-sm text-gray-500">
                Loading branch information...
              </p>
            ) : loadingPlaces ? (
              <p className="mt-2 text-sm text-gray-500">
                Loading places from your branch...
              </p>
            ) : !branchCity || !branchCountry ? (
              <p className="mt-2 text-sm text-gray-500">
                Please set your current branch in profile settings to search for places.
              </p>
            ) : searching ? (
              <div className="mt-4 text-center py-8">
                <p className="text-gray-500">Filtering places...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((place) => {
                  const isAlreadyAdded = existingItems.some(item => item.placeId === place.placeId);
                  return (
                  <div
                    key={place.placeId}
                    className={`p-4 border rounded-lg transition-colors ${
                      isAlreadyAdded
                        ? "opacity-50 cursor-not-allowed bg-gray-100"
                        : selectedPlace?.placeId === place.placeId
                        ? "border-blue-500 bg-blue-50 cursor-pointer"
                        : "cursor-pointer hover:border-blue-500"
                    }`}
                    onClick={() => !isAlreadyAdded && handleSelectPlace(place)}
                  >
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                      {place.imageUrl ? (
                        <img
                          src={place.imageUrl}
                          alt={place.placeName}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <MapPin className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">
                          {place.placeName}
                        </h4>
                        {isAlreadyAdded && (
                          <span className="text-xs bg-gray-300 text-gray-600 px-2 py-0.5 rounded">
                            Already added
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{place.address}</p>
                      {place.description && (
                        <p className="text-xs text-gray-500 mt-1">
                          {place.description}
                        </p>
                      )}
                    </div>
                    {selectedPlace?.placeId === place.placeId && (
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          ✓
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                  );
                })}
              </div>
            ) : searchQuery.trim() ? (
              <div className="mt-4 text-center py-8">
                <p className="text-gray-500">No places found matching "{searchQuery}". Try a different search term.</p>
              </div>
            ) : allPlaces.length === 0 ? (
              <div className="mt-4 text-center py-8">
                <p className="text-gray-500">No places available in your current branch ({branchCity}, {branchCountry}).</p>
              </div>
            ) : (
              <div className="mt-4 text-center py-8">
                <p className="text-gray-500">Showing all places from your branch. Type to filter by name or address.</p>
              </div>
            )}
          </div>

          {selectedPlace && (
            <>
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Schedule Details</h3>

                {/* Day and Order */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="flex flex-col">
                    <Label htmlFor="dayNumber" className="mb-2.5 block">Day *</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between h-10"
                        >
                          Day {formData.dayNumber}
                          <Calendar className="h-4 w-4 text-gray-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        {Array.from({ length: totalDays }, (_, i) => i + 1).map(
                          (day) => (
                            <DropdownMenuItem
                              key={day}
                              onClick={() =>
                                setFormData({ ...formData, dayNumber: day })
                              }
                            >
                              Day {day}
                            </DropdownMenuItem>
                          )
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-col">
                    <Label htmlFor="sortOrder" className="mb-2.5 block">
                      Order in Day (Auto-calculated) *
                    </Label>
                    <Input
                      id="sortOrder"
                      type="number"
                      min="1"
                      value={formData.sortOrder || 1}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sortOrder: parseInt(e.target.value) || 1,
                        })
                      }
                      required
                      className="bg-gray-50 h-10"
                      title="Automatically calculated based on existing items in the same time slot. You can manually adjust if needed."
                    />
                    <div className="mt-1 space-y-0.5">
                      {formData.startTime && formData.endTime && (
                        <p className="text-xs text-blue-600">
                          Time Slot: <strong>{getTimeSlotType(formData.startTime, formData.endTime)}</strong>
                        </p>
                      )}
                      {formData.dayNumber && formData.sortOrder && (
                        (() => {
                          const conflict = checkSortOrderConflict(
                            formData.dayNumber,
                            formData.sortOrder
                          );
                          const dayItemsCount = existingItems.filter(item => item.dayNumber === formData.dayNumber).length;
                          return conflict ? (
                            <p className="text-xs text-red-600">{conflict}</p>
                          ) : (
                            <p className="text-xs text-gray-500">
                              Auto-calculated: {dayItemsCount} item(s) in Day {formData.dayNumber}, next order: {formData.sortOrder}
                            </p>
                          );
                        })()
                      )}
                    </div>
                  </div>
                </div>

                {/* Activity Title and Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="flex flex-col">
                    <Label htmlFor="activityTitle" className="mb-2.5 block">
                      Activity Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="activityTitle"
                      placeholder="e.g., Temple Visit"
                      value={formData.activityTitle}
                      onChange={(e) =>
                        setFormData({ ...formData, activityTitle: e.target.value })
                      }
                      required
                      className="h-10"
                    />
                  </div>
                  <div className="flex flex-col">
                    <Label htmlFor="activityType" className="mb-2.5 block">
                      Activity Type <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="activityType"
                      placeholder="e.g., Sightseeing"
                      value={formData.activityType}
                      onChange={(e) =>
                        setFormData({ ...formData, activityType: e.target.value })
                      }
                      required
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Activity Description and Time Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Activity Description - Left Side (50%) */}
                  <div className="flex flex-col">
                    <Label htmlFor="activityDescription" className="mb-2.5">
                      Activity Description <span className="text-red-500">*</span>
                    </Label>
                    <textarea
                      id="activityDescription"
                      placeholder="Describe the activity..."
                      value={formData.activityDescription}
                      onChange={(e) =>
                        setFormData({ ...formData, activityDescription: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-h-[150px]"
                      rows={5}
                      required
                    />
                  </div>

                  {/* Time Fields - Right Side (50%) */}
                  <div className="flex flex-col space-y-4">
                    {/* Start Time and Estimated Duration - Same Row */}
                    <div className="flex gap-3">
                      {/* Start Time */}
                      <div className="flex-1">
                        <Label htmlFor="startTime" className="mb-2.5 block">
                          Start Time <span className="text-red-500">*</span>
                        </Label>
                        <div className="inline-flex items-center gap-1 px-2 py-2 border-2 border-gray-300 rounded-md hover:border-orange-300 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500 transition-all duration-200 bg-white h-10">
                          {(() => {
                            const time12h = convert24hTo12h(formData.startTime || '')
                            return (
                              <>
                                <div className="relative">
                                  <select
                                    value={time12h.hour}
                                    onChange={(e) => handleStartTimeHourChange(e.target.value)}
                                    className="w-12 px-1 py-0.5 border-0 bg-transparent text-center font-medium text-gray-900 text-sm focus:outline-none cursor-pointer appearance-none"
                                    required
                                  >
                                    {Array.from({ length: 12 }, (_, i) => {
                                      const hour = (i + 1).toString().padStart(2, '0')
                                      return <option key={hour} value={hour}>{hour}</option>
                                    })}
                                  </select>
                                  <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400 pointer-events-none" />
                                </div>
                                <span className="text-gray-400 text-xs">:</span>
                                <div className="relative">
                                  <select
                                    value={time12h.minute}
                                    onChange={(e) => handleStartTimeMinuteChange(e.target.value)}
                                    className="w-12 px-1 py-0.5 border-0 bg-transparent text-center font-medium text-gray-900 text-sm focus:outline-none cursor-pointer appearance-none"
                                    required
                                  >
                                    {Array.from({ length: 60 }, (_, i) => {
                                      const minute = i.toString().padStart(2, '0')
                                      return <option key={minute} value={minute}>{minute}</option>
                                    })}
                                  </select>
                                  <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400 pointer-events-none" />
                                </div>
                                <div className="relative ml-0.5">
                                  <select
                                    value={time12h.period}
                                    onChange={(e) => handleStartTimePeriodChange(e.target.value)}
                                    className="w-12 px-1 py-0.5 border-0 bg-transparent text-center font-medium text-gray-900 text-sm focus:outline-none cursor-pointer appearance-none"
                                    required
                                  >
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                  </select>
                                  <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400 pointer-events-none" />
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </div>

                      {/* Estimated Duration */}
                      <div className="w-32">
                        <Label htmlFor="estimatedDuration" className="mb-2.5 block">
                          Duration (min) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="estimatedDuration"
                          type="number"
                          min="30"
                          step="30"
                          placeholder="e.g., 120"
                          value={formData.estimatedDuration || ""}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || undefined;
                            setFormData({ ...formData, estimatedDuration: value });
                          }}
                          required
                          className="w-full h-10"
                        />
                        {formData.estimatedDuration && (
                          <p className="text-xs text-gray-500 mt-1">
                            Min: 30
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actual Duration (if completed) */}
                    {formData.isCompleted && (
                      <div>
                        <Label htmlFor="actualDuration" className="mb-2.5 block">
                          Actual Duration (minutes) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="actualDuration"
                          type="number"
                          min="30"
                          step="30"
                          placeholder="e.g., 120"
                          value={formData.actualDuration || ""}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || undefined;
                            setFormData({ ...formData, actualDuration: value });
                          }}
                          className="h-10"
                        />
                        {formData.actualDuration && (
                          <p className="text-xs text-gray-500 mt-1">
                            Minimum: 30 minutes
                          </p>
                        )}
                      </div>
                    )}

                    {/* End Time */}
                    <div>
                      <Label htmlFor="endTime" className="mb-2.5 block">
                        End Time (Calculated)
                      </Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={formData.endTime || ""}
                        readOnly
                        className="bg-gray-100 cursor-not-allowed h-10"
                      />
                      {formData.endTime && (
                        <p className="text-xs text-gray-500 mt-1">
                          Auto-calculated: {(() => {
                            const [h, m] = formData.endTime.split(':').map(Number);
                            if (h === 0) return `12:${m.toString().padStart(2, '0')} AM`;
                            if (h < 12) return `${h}:${m.toString().padStart(2, '0')} AM`;
                            if (h === 12) return `12:${m.toString().padStart(2, '0')} PM`;
                            return `${h - 12}:${m.toString().padStart(2, '0')} PM`;
                          })()} <br />
                          Use Start Time + Actual Duration if the activity is completed, otherwise use Start Time + Estimated Duration.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Place Operating Hours and BusyTime Info */}
                {loadingPlaceDetail && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">Loading place details...</p>
                  </div>
                )}
                {!loadingPlaceDetail && placeDetail && (
                  <div className="mb-4 space-y-2">
                    {/* Operating Hours */}
                    {placeDetail.openTime && placeDetail.closeTime ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>Operating Hours:</strong> {convertUtcToLocalTime(placeDetail.openTime, localStorage.getItem('timezone'))} - {convertUtcToLocalTime(placeDetail.closeTime, localStorage.getItem('timezone'))}
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          Activity time must be within these hours.
                        </p>
                        {formData.startTime && formData.endTime && (() => {
                          const operatingHoursError = checkPlaceOperatingHours(formData.startTime, formData.endTime);
                          return operatingHoursError ? (
                            <p className="text-xs text-red-600 mt-1 font-medium">{operatingHoursError}</p>
                          ) : null;
                        })()}
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Operating Hours:</strong> Not specified (open 24/7)
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          You can schedule activities at any time.
                        </p>
                      </div>
                    )}
                    
                    {/* BusyTime Warning */}
                    {placeDetail.busyTime && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>Busy Time:</strong> {placeDetail.busyTime}
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Avoid scheduling activities during this time.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Transport Method and Costs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  {/* Transportation Method */}
                  <div className="flex flex-col">
                    <Label className="mb-2.5 block">Transportation Method</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between h-10"
                        >
                          {formData.transportMethod || "Select method"}
                          <Navigation className="h-4 w-4 text-gray-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        {transportMethods.map((method) => (
                          <DropdownMenuItem
                            key={method}
                            onClick={() =>
                              setFormData({ ...formData, transportMethod: method })
                            }
                          >
                            {method}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Estimated Cost */}
                  <div className="flex flex-col">
                    <Label htmlFor="estimatedCost" className="mb-2.5 block">Estimated Cost ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="estimatedCost"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g., 50.00"
                        value={formData.estimatedCost || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            estimatedCost: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          })
                        }
                        className="pl-10 h-10"
                      />
                    </div>
                  </div>

                  {/* Transport Cost */}
                  <div className="flex flex-col">
                    <Label htmlFor="transportCost" className="mb-2.5 block">Transport Cost ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="transportCost"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g., 10.00"
                        value={formData.transportCost || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            transportCost: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          })
                        }
                        className="pl-10 h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Actual Cost (if completed) */}
                {formData.isCompleted && (
                  <div className="mb-3 flex flex-col">
                    <Label htmlFor="actualCost" className="mb-2.5 block">Actual Cost ($)</Label>
                    <div className="relative max-w-xs">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="actualCost"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g., 50.00"
                        value={formData.actualCost || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            actualCost: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          })
                        }
                        className="pl-10 h-10"
                      />
                    </div>
                  </div>
                )}

                {/* Booking Status and Reference */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="flex flex-col">
                    <Label className="mb-2.5 block">Booking Status</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between h-10"
                        >
                          {formData.bookingStatus}
                          <FileText className="h-4 w-4 text-gray-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        {bookingStatuses.map((status) => (
                          <DropdownMenuItem
                            key={status}
                            onClick={() =>
                              setFormData({ ...formData, bookingStatus: status })
                            }
                          >
                            {status}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex flex-col">
                    <Label htmlFor="bookingReference" className="mb-2.5 block">Booking Reference</Label>
                    <Input
                      id="bookingReference"
                      placeholder="e.g., ABC123"
                      value={formData.bookingReference}
                      onChange={(e) =>
                        setFormData({ ...formData, bookingReference: e.target.value })
                      }
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Completion */}
                <div className="mb-3 hidden">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isCompleted || false}
                      onChange={(e) =>
                        setFormData({ ...formData, isCompleted: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Mark as completed</span>
                  </label>
                </div>

                {/* Completion Notes */}
                {formData.isCompleted && (
                  <div className="mb-3">
                    <Label htmlFor="completionNotes" className="mb-2.5">Completion Notes</Label>
                    <textarea
                      id="completionNotes"
                      placeholder="Add notes about completion..."
                      value={formData.completionNotes}
                      onChange={(e) =>
                        setFormData({ ...formData, completionNotes: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3 border-t justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 w-auto min-w-[140px]"
                  disabled={loading}
                >
                  {loading ? "Adding..." : "Add to Itinerary"}
                </Button>
              </div>
            </>
          )}
        </form>
      </Card>
    </div>
  );
}


