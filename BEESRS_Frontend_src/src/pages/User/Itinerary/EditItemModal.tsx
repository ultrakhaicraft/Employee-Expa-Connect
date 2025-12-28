import { useState, useEffect } from "react";
import {
  X,
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
  UpdateItineraryItemRequest,
  ItineraryItem,
} from "../../../types/itinerary.types";
import { updateItineraryItem, getItineraryItems } from "../../../services/itineraryService";
import { ViewDetailPlace } from "../../../services/userService";
import { convertLocalTimeToUtc, convertUtcToLocalTime, getTimezoneFromStorage } from "../../../utils/timezone";

interface EditItemModalProps {
  item: ItineraryItem;
  itineraryId: string;
  totalDays: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditItemModal({
  item,
  itineraryId,
  totalDays,
  onClose,
  onSuccess,
}: EditItemModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [existingItems, setExistingItems] = useState<ItineraryItem[]>([]);
  const [placeDetail, setPlaceDetail] = useState<any>(null);
  const [loadingPlaceDetail, setLoadingPlaceDetail] = useState(false);

  const [formData, setFormData] = useState<UpdateItineraryItemRequest>({
    placeId: item.placeId,
    dayNumber: item.dayNumber,
    sortOrder: item.sortOrder || item.orderInDay || 1,
    startTime: item.startTime?.split(':').slice(0, 2).join(':') || "",
    endTime: item.endTime?.split(':').slice(0, 2).join(':') || "",
    actualDuration: item.actualDuration ? Math.floor(item.actualDuration / 60) : undefined,
    estimatedDuration: item.estimatedDuration ? Math.floor(item.estimatedDuration / 60) : undefined,
    activityTitle: item.activityTitle || "",
    activityDescription: item.activityDescription || "",
    activityType: item.activityType || "",
    estimatedCost: item.estimatedCost,
    actualCost: item.actualCost,
    bookingReference: item.bookingReference || "",
    bookingStatus: item.bookingStatus || "NotBooked",
    transportMethod: item.transportMethod,
    transportCost: item.transportCost,
    isCompleted: item.isCompleted || false,
    completionNotes: item.completionNotes || "",
  });

  // Load existing items to check for conflicts (excluding current item)
  useEffect(() => {
    let isMounted = true;
    const loadExistingItems = async () => {
      try {
        const items = await getItineraryItems(itineraryId);
        if (isMounted) {
          // Exclude current item from conflict checking
          setExistingItems(items.filter(i => i.itemId !== item.itemId));
        }
      } catch (error) {
        console.error("Failed to load existing items:", error);
      }
    };
    loadExistingItems();
    return () => {
      isMounted = false;
    };
  }, [itineraryId, item.itemId]);

  // Load place detail
  useEffect(() => {
    if (item.placeId) {
      loadPlaceDetail();
    }
  }, [item.placeId]);

  const loadPlaceDetail = async () => {
    if (!item.placeId) return;
    setLoadingPlaceDetail(true);
    try {
      const detail = await ViewDetailPlace({ placeId: item.placeId });
      setPlaceDetail(detail);
    } catch (error) {
      console.error("Failed to load place detail:", error);
      setPlaceDetail(null);
    } finally {
      setLoadingPlaceDetail(false);
    }
  };

  // Calculate endTime from startTime + estimatedDuration
  useEffect(() => {
    if (formData.startTime && formData.estimatedDuration) {
      let endTime: string = calculateEstimatedEndTime(formData.startTime, formData.estimatedDuration);

      if (formData.isCompleted && formData.actualDuration) {
        endTime = calculateActualEndTime(formData.startTime, formData.actualDuration);
      }

      if (formData.endTime !== endTime) {
        setFormData(prev => ({ ...prev, endTime }));
      }
    } else if (!formData.startTime || !formData.estimatedDuration) {
      if (formData.endTime) {
        setFormData(prev => ({ ...prev, endTime: "" }));
      }
    }
  }, [formData.startTime, formData.estimatedDuration, formData.actualDuration, formData.isCompleted]);

  // Helper functions (same as AddItemModal)


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

  const calculateSortOrder = (dayNumber: number): number => {
    const dayItems = existingItems.filter(i => i.dayNumber === dayNumber);
    return dayItems.length + 1;
  };

  const checkTimeConflict = (startTime: string, endTime: string, dayNumber: number): string | null => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    for (const existingItem of existingItems) {
      if (existingItem.dayNumber === dayNumber && existingItem.startTime && existingItem.endTime) {
        const itemStart = timeToMinutes(existingItem.startTime);
        const itemEnd = timeToMinutes(existingItem.endTime);

        if (startMinutes < itemEnd && endMinutes > itemStart) {
          return `Time conflicts with existing activity: ${existingItem.startTime} - ${existingItem.endTime}`;
        }
      }
    }
    return null;
  };

  const checkMinimumGap = (startTime: string, dayNumber: number): { error: string | null; suggestedTime: string | null } => {
    const startMinutes = timeToMinutes(startTime);

    // Chỉ check với các items trong cùng ngày và có endTime trước startTime hiện tại
    const dayItems = existingItems
      .filter(i => {
        if (i.dayNumber !== dayNumber || !i.endTime) return false;
        const itemEnd = timeToMinutes(i.endTime);
        // Chỉ lấy items có endTime trước startTime hiện tại
        return itemEnd < startMinutes;
      })
      .sort((a, b) => {
        // Sắp xếp theo endTime giảm dần (item gần nhất trước)
        const aEnd = timeToMinutes(a.endTime!);
        const bEnd = timeToMinutes(b.endTime!);
        return bEnd - aEnd;
      });

    // Chỉ validate nếu có item trước đó
    if (dayItems.length > 0) {
      const lastItem = dayItems[0]; // Item có endTime gần nhất và trước startTime
      const lastItemEnd = timeToMinutes(lastItem.endTime!);
      const gapMinutes = startMinutes - lastItemEnd;

      // Chỉ check nếu gap < 60 phút (1 giờ)
      if (gapMinutes < 60 && gapMinutes >= 0) {
        const suggestedEndMinutes = lastItemEnd + 60;
        const suggestedHours = Math.floor(suggestedEndMinutes / 60) % 24;
        const suggestedMins = suggestedEndMinutes % 60;
        const suggestedTime = `${suggestedHours.toString().padStart(2, '0')}:${suggestedMins.toString().padStart(2, '0')}`;

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

    // Nếu không có item trước đó, không cần validate gap
    return { error: null, suggestedTime: null };
  };

  const parseBusyTime = (busyTimeStr: string | null | undefined): { start: number; end: number } | null => {
    if (!busyTimeStr) return null;
    const parts = busyTimeStr.split('-');
    if (parts.length !== 2) return null;
    const start = timeToMinutes(parts[0].trim());
    const end = timeToMinutes(parts[1].trim());
    return { start, end };
  };

  const checkBusyTime = (startTime: string, endTime: string): string | null => {
    if (!placeDetail?.busyTime) return null;
    const busyTimeRange = parseBusyTime(placeDetail.busyTime);
    if (!busyTimeRange) return null;

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (startMinutes < busyTimeRange.end && endMinutes > busyTimeRange.start) {
      return `This time overlaps with place's busy time (${placeDetail.busyTime}). Please choose a different time.`;
    }
    return null;
  };

  const checkPlaceOperatingHours = (startTime: string, endTime: string): string | null => {
    if (!placeDetail?.openTime || !placeDetail?.closeTime) return null;

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

    if (closeMinutes < openMinutes) {
      const midnight = 24 * 60;
      const isWithinHours =
        (startMinutes >= openMinutes && endMinutes <= midnight && endMinutes > startMinutes) ||
        (startMinutes >= 0 && endMinutes <= closeMinutes && endMinutes > startMinutes) ||
        (startMinutes >= openMinutes && endMinutes <= closeMinutes && startMinutes > endMinutes);

      if (!isWithinHours) {
        const timezone = localStorage.getItem('timezone');
        const localOpenTime = convertUtcToLocalTime(placeDetail.openTime, timezone);
        const localCloseTime = convertUtcToLocalTime(placeDetail.closeTime, timezone);
        return `Activity time must be within place operating hours (${localOpenTime} - ${localCloseTime}).`;
      }
    } else {
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

    const errors: string[] = [];

    if (!formData.dayNumber || formData.dayNumber < 1 || formData.dayNumber > 30) {
      errors.push("Day Number must be between 1 and 30");
    }

    if (!formData.startTime || formData.startTime.trim() === '') {
      errors.push("Start time is required");
    }

    if (!formData.estimatedDuration || formData.estimatedDuration < 30) {
      errors.push("Estimated duration is required and must be at least 30 minutes");
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

    if (formData.startTime && formData.endTime && formData.dayNumber) {
      const conflictError = checkTimeConflict(formData.startTime, formData.endTime, formData.dayNumber);
      if (conflictError) {
        errors.push(conflictError);
      }

      const gapResult = checkMinimumGap(formData.startTime, formData.dayNumber);
      if (gapResult.error) {
        errors.push(gapResult.error);
      }

      const busyTimeError = checkBusyTime(formData.startTime, formData.endTime);
      if (busyTimeError) {
        errors.push(busyTimeError);
      }

      const operatingHoursError = checkPlaceOperatingHours(formData.startTime, formData.endTime);
      if (operatingHoursError) {
        errors.push(operatingHoursError);
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
      //Convert times to UTC before sending to backend
      // Get timezone from localStorage
      const timezone = getTimezoneFromStorage();

      //Convert startTime and endTime to UTC before sending to backend
      let startTime = convertLocalTimeToUtc(formData.startTime!, timezone || 'UTC+00:00');
      let endTime = convertLocalTimeToUtc(formData.endTime!, timezone || 'UTC+00:00');

      // Format times to HH:mm:ss
      if (startTime && startTime.split(':').length === 2) {
        startTime = `${startTime}:00`;
      }
      if (endTime && endTime.split(':').length === 2) {
        endTime = `${endTime}:00`;
      }

      const updateData: UpdateItineraryItemRequest = {
        ...formData,
        startTime,
        endTime,
        estimatedDuration: formData.estimatedDuration ? formData.estimatedDuration : undefined, // Convert to seconds
      };

      await updateItineraryItem(item.itemId, updateData);

      toast({
        title: "✅ Success",
        description: "Itinerary item updated successfully!",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to update item:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to update item";
      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl max-h-[85vh] bg-white shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-20 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">Edit Itinerary Item</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1">
          {/* Place Info (Read-only) */}
          {item.place && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                {item.place.imageUrl && (
                  <img
                    src={item.place.imageUrl}
                    alt={item.place.placeName}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{item.place.placeName}</h3>
                  <p className="text-sm text-gray-600">{item.place.address}</p>
                </div>
              </div>
            </div>
          )}

          {/* Place Operating Hours and BusyTime Info */}
          {loadingPlaceDetail && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">Loading place details...</p>
            </div>
          )}
          {!loadingPlaceDetail && placeDetail && (
            <div className="mb-3 space-y-2">
              {placeDetail.openTime && placeDetail.closeTime ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Operating Hours:</strong> {convertUtcToLocalTime(placeDetail.openTime, localStorage.getItem('timezone'))} - {convertUtcToLocalTime(placeDetail.closeTime, localStorage.getItem('timezone'))}
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
                </div>
              )}

              {placeDetail.busyTime && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Busy Time:</strong> {placeDetail.busyTime}
                  </p>
                </div>
              )}
            </div>
          )}

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
                  {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
                    <DropdownMenuItem
                      key={day}
                      onClick={() => {
                        const newSortOrder = calculateSortOrder(day);
                        setFormData({ ...formData, dayNumber: day, sortOrder: newSortOrder });
                      }}
                    >
                      Day {day}
                    </DropdownMenuItem>
                  ))}
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
              />
              {formData.dayNumber && formData.sortOrder && (
                <p className="text-xs text-gray-500 mt-1">
                  Auto-calculated: {existingItems.filter(i => i.dayNumber === formData.dayNumber).length} item(s) in Day {formData.dayNumber}, next order: {formData.sortOrder}
                </p>
              )}
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
                  <DropdownMenuItem onClick={() => setFormData({ ...formData, transportMethod: "Walking" })}>
                    Walking
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFormData({ ...formData, transportMethod: "Driving" })}>
                    Driving
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFormData({ ...formData, transportMethod: "PublicTransport" })}>
                    Public Transport
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFormData({ ...formData, transportMethod: "Bicycle" })}>
                    Bicycle
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFormData({ ...formData, transportMethod: "Flight" })}>
                    Flight
                  </DropdownMenuItem>
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
                  placeholder="0.00"
                  value={formData.estimatedCost || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimatedCost: e.target.value ? parseFloat(e.target.value) : undefined,
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
                  placeholder="0.00"
                  value={formData.transportCost || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      transportCost: e.target.value ? parseFloat(e.target.value) : undefined,
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
                  placeholder="0.00"
                  value={formData.actualCost || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      actualCost: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="pl-10 h-10"
                />
              </div>
            </div>
          )}

          {/* Booking Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="flex flex-col">
              <Label htmlFor="bookingStatus" className="mb-2.5 block">Booking Status</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between h-10"
                  >
                    {formData.bookingStatus || "NotBooked"}
                    <FileText className="h-4 w-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem onClick={() => setFormData({ ...formData, bookingStatus: "NotBooked" })}>
                    NotBooked
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFormData({ ...formData, bookingStatus: "Pending" })}>
                    Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFormData({ ...formData, bookingStatus: "Confirmed" })}>
                    Confirmed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFormData({ ...formData, bookingStatus: "Cancelled" })}>
                    Cancelled
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-col">
              <Label htmlFor="bookingReference" className="mb-2.5 block">Booking Reference</Label>
              <Input
                id="bookingReference"
                placeholder="e.g., ABC123"
                value={formData.bookingReference || ""}
                onChange={(e) =>
                  setFormData({ ...formData, bookingReference: e.target.value })
                }
                className="h-10"
              />
            </div>
          </div>

          {/* Completion */}
          <div className="mb-3">
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
                value={formData.completionNotes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, completionNotes: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
          )}

          {/* Action Buttons */}
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
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 w-auto min-w-[140px]"
            >
              {loading ? "Updating..." : "Update Item"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

