import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  FileText, 
  Sparkles,
  Tag,
  Timer,
  Image as ImageIcon,
  Upload,
  Loader2,
  X,
  MapPin,
  Search,
  CheckCircle2,
  Phone,
  Globe,
  Star,
  Lock,
  ChevronDown
} from "lucide-react";
import eventService from "../../../services/eventService";
import type { EventRequest } from "../../../services/eventService";
import axiosInstance from "../../../utils/axios";
import { ViewDetailPlace } from "../../../services/userService";
import { convertUtcToLocalTime } from "../../../utils/timezone";
import {
  EVENT_TYPES,
  MIN_EXPECTED_ATTENDEES,
  MAX_EXPECTED_ATTENDEES,
  MIN_BUDGET_PER_PERSON,
  MIN_ADVANCE_DAYS,
} from "../../../constants/eventConstants";

const CreateEventPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [eventImagePreview, setEventImagePreview] = useState<string | null>(null);
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<EventRequest>({
    title: "",
    description: "",
    eventType: "",
    scheduledDate: "",
    scheduledTime: "",
    expectedAttendees: MIN_EXPECTED_ATTENDEES,
    budgetTotal: undefined,
    budgetPerPerson: undefined,
    estimatedDuration: 2,
    finalPlaceId: undefined, // Optional: Direct venue selection
    acceptanceThreshold: 0.7, // Default 70% (0.7)
    privacy: "Public", // Default: Public
  });

  // Place selection state
  const [showPlaceSelector, setShowPlaceSelector] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ placeId: string; name: string; address?: string } | null>(null);
  const [placeSearchQuery, setPlaceSearchQuery] = useState("");
  const [availablePlaces, setAvailablePlaces] = useState<any[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  
  // Place detail modal state
  const [showPlaceDetail, setShowPlaceDetail] = useState(false);
  const [selectedPlaceDetail, setSelectedPlaceDetail] = useState<any>(null);
  const [loadingPlaceDetail, setLoadingPlaceDetail] = useState(false);

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

  // Handler for scheduledTime hour change
  const handleScheduledTimeHourChange = (hour: string) => {
    const time12h = convert24hTo12h(formData.scheduledTime)
    const time24h = convert12hTo24h(hour, time12h.minute, time12h.period)
    const [hours, minutes] = time24h.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes
    const minMinutes = 7 * 60
    const maxMinutes = 22 * 60
    
    if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
      setError("Time must be between 7:00 AM and 10:00 PM")
    } else {
      setError("")
    }
    setFormData(prev => ({ ...prev, scheduledTime: time24h }))
  }

  // Handler for scheduledTime minute change
  const handleScheduledTimeMinuteChange = (minute: string) => {
    const time12h = convert24hTo12h(formData.scheduledTime)
    const time24h = convert12hTo24h(time12h.hour, minute, time12h.period)
    const [hours, minutes] = time24h.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes
    const minMinutes = 7 * 60
    const maxMinutes = 22 * 60
    
    if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
      setError("Time must be between 7:00 AM and 10:00 PM")
    } else {
      setError("")
    }
    setFormData(prev => ({ ...prev, scheduledTime: time24h }))
  }

  // Handler for scheduledTime period change
  const handleScheduledTimePeriodChange = (period: string) => {
    const time12h = convert24hTo12h(formData.scheduledTime)
    const time24h = convert12hTo24h(time12h.hour, time12h.minute, period)
    const [hours, minutes] = time24h.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes
    const minMinutes = 7 * 60
    const maxMinutes = 22 * 60
    
    if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
      setError("Time must be between 7:00 AM and 10:00 PM")
    } else {
      setError("")
    }
    setFormData(prev => ({ ...prev, scheduledTime: time24h }))
  }

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    
    // Validate time range (7:00 AM - 10:00 PM)
    if (name === "scheduledTime" && value !== "") {
      const [hours, minutes] = value.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes;
      const minMinutes = 7 * 60; // 7:00 AM
      const maxMinutes = 22 * 60; // 10:00 PM (22:00)
      
      if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
        setError("Time must be between 7:00 AM and 10:00 PM");
        return;
      }
      setError(""); // Clear error if time is valid
    }
    
    // Validate expected attendees (must be > 1)
    if (name === "expectedAttendees" && value !== "") {
      const attendees = Number(value);
      if (attendees <= 1) {
        setError("Attendees must be greater than 1");
        return;
      }
      if (attendees > MAX_EXPECTED_ATTENDEES) {
        setError(`Attendees cannot exceed ${MAX_EXPECTED_ATTENDEES}`);
        return;
      }
      setError(""); // Clear error if valid
      
      const newFormData: any = {
        ...formData,
        expectedAttendees: attendees,
      };
      
      // Recalculate based on whichever budget field was set (USD - 2 decimal places)
      if (formData.budgetPerPerson) {
        newFormData.budgetTotal = Number((formData.budgetPerPerson * attendees).toFixed(2));
      } else if (formData.budgetTotal) {
        newFormData.budgetPerPerson = Number((formData.budgetTotal / attendees).toFixed(2));
        // Validate budget per person after recalculation
        if (newFormData.budgetPerPerson < MIN_BUDGET_PER_PERSON) {
          setError(`Budget per person must be at least $${MIN_BUDGET_PER_PERSON} USD`);
          return;
        }
      }
      
      setFormData(newFormData);
      return;
    }

    // Validate duration (must be > 1 hour)
    if (name === "estimatedDuration" && value !== "") {
      const duration = Number(value);
      if (duration <= 1) {
        setError("Duration must be greater than 1 hour");
        return;
      }
      if (duration > 12) {
        setError("Duration cannot exceed 12 hours");
        return;
      }
      setError(""); // Clear error if valid
    }

    // Auto-calculate budget fields (USD - 2 decimal places)
    if (name === "budgetTotal") {
      if (value === "" || value === null || value === undefined) {
        // Khi xóa Total Budget, chỉ xóa Total Budget, giữ nguyên Per Person
        setFormData((prev) => ({
          ...prev,
          budgetTotal: undefined,
        }));
        setError(""); // Clear error
        return;
      }
      
      const total = Number(value);
      if (isNaN(total) || total <= 0) {
        setFormData((prev) => ({
          ...prev,
          budgetTotal: undefined,
        }));
        return;
      }
      
      const minBudget = formData.expectedAttendees * MIN_BUDGET_PER_PERSON;
      
      // ✅ Tự động tính Per Person dựa trên Total Budget và số attendees
      const perPerson = formData.expectedAttendees > 0 
        ? Number((total / formData.expectedAttendees).toFixed(2))
        : undefined;
      
      setFormData((prev) => ({
        ...prev,
        budgetTotal: total,
        budgetPerPerson: perPerson,
      }));
      
      // Chỉ hiển thị warning nếu giá trị < minimum, nhưng không chặn input
      if (total > 0 && total < minBudget) {
        setError(`Total budget must be at least $${minBudget} USD (${MIN_BUDGET_PER_PERSON} USD per person × ${formData.expectedAttendees} attendees)`);
      } else {
        setError(""); // Clear error if valid
      }
      return;
    }
    
    if (name === "budgetPerPerson") {
      if (value === "" || value === null || value === undefined) {
        // Khi xóa Per Person, chỉ xóa Per Person, giữ nguyên Total Budget
        setFormData((prev) => ({
          ...prev,
          budgetPerPerson: undefined,
        }));
        setError(""); // Clear error
        return;
      }
      
      const perPerson = Number(value);
      if (isNaN(perPerson) || perPerson <= 0) {
        setFormData((prev) => ({
          ...prev,
          budgetPerPerson: undefined,
        }));
        return;
      }
      
      // ✅ Tự động tính Total Budget dựa trên Per Person và số attendees
      const total = formData.expectedAttendees > 0 
        ? Number((perPerson * formData.expectedAttendees).toFixed(2))
        : undefined;
      
      setFormData((prev) => ({
        ...prev,
        budgetPerPerson: perPerson,
        budgetTotal: total,
      }));
      
      // Chỉ hiển thị warning nếu giá trị < minimum, nhưng không chặn input
      if (perPerson > 0 && perPerson < MIN_BUDGET_PER_PERSON) {
        setError(`Budget per person must be at least $${MIN_BUDGET_PER_PERSON} USD`);
      } else {
        setError(""); // Clear error if valid
      }
      return;
    }
    
    // Xử lý các trường khác (budgetTotal và budgetPerPerson đã được xử lý riêng ở trên)
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "expectedAttendees" ||
        name === "estimatedDuration"
          ? value === ""
            ? undefined
            : Number(value)
          : value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError("Event title is required");
      return false;
    }

    if (!formData.eventType) {
      setError("Please select an event type");
      return false;
    }

    if (!formData.scheduledDate) {
      setError("Please select a date");
      return false;
    }

    if (!formData.scheduledTime) {
      setError("Please select a time");
      return false;
    }

    // Validate time range (7:00 AM - 10:00 PM)
    const [hours, minutes] = formData.scheduledTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes;
    const minMinutes = 7 * 60; // 7:00 AM
    const maxMinutes = 22 * 60; // 10:00 PM (22:00)
    
    if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
      setError("Time must be between 7:00 AM and 10:00 PM");
      return false;
    }

    // Validate date is at least 3 days in advance
    const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + MIN_ADVANCE_DAYS);

    if (scheduledDateTime < minDate) {
      setError(`Event must be scheduled at least ${MIN_ADVANCE_DAYS} days in advance`);
      return false;
    }

    if (
      formData.expectedAttendees < MIN_EXPECTED_ATTENDEES ||
      formData.expectedAttendees > MAX_EXPECTED_ATTENDEES
    ) {
      setError(
        `Expected attendees must be between ${MIN_EXPECTED_ATTENDEES} and ${MAX_EXPECTED_ATTENDEES}`
      );
      return false;
    }

    if (formData.budgetTotal && formData.budgetTotal < formData.expectedAttendees * MIN_BUDGET_PER_PERSON) {
      setError(
        `Budget too low. Minimum $${MIN_BUDGET_PER_PERSON.toLocaleString()} USD per person required`
      );
      return false;
    }

    return true;
  };

  const handleEventImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Image must be less than 10MB");
        return;
      }
      setEventImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEventImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveEventImage = () => {
    setEventImageFile(null);
    setEventImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerateEventImage = async () => {
    if (!formData.title) {
      setError("Event title is required to generate an image");
      return;
    }

    setGeneratingImage(true);
    try {
      const imageUrl = await eventService.generateEventCoverImage({
        title: formData.title,
        description: formData.description,
        eventType: formData.eventType,
        location: "",
        country: ""
      });

      setEventImagePreview(imageUrl);
      setEventImageFile(null);
      
      setError("");
    } catch (error: any) {
      setError(error.message || "Failed to generate image");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Handle image: upload file or use generated URL
      let finalImageUrl: string | undefined = undefined;
      
      // If we have a file to upload, we'll upload after creating the event
      if (eventImageFile) {
        // Create event first without image
        const createdEvent = await eventService.createEvent({
          ...formData,
          eventImageUrl: undefined
        });
        
        // Upload image after event is created
        try {
          await eventService.uploadEventImage(createdEvent.eventId, eventImageFile);
        } catch (uploadError: any) {
          console.error("Failed to upload image:", uploadError);
          // Continue even if upload fails
        }
        
        navigate(`/user/events/${createdEvent.eventId}`);
        return;
      }
      
      // If we have a generated image URL (from AI), include it in create request
      if (eventImagePreview && !eventImageFile) {
        finalImageUrl = eventImagePreview;
      }
      // If no image provided, try to generate one automatically
      else if (formData.title) {
        try {
          finalImageUrl = await eventService.generateEventCoverImage({
            title: formData.title,
            description: formData.description,
            eventType: formData.eventType,
            location: "",
            country: ""
          });
        } catch (genError: any) {
          // Continue without image if generation fails
          console.warn("Failed to auto-generate image:", genError);
        }
      }

      // Create event with image URL if available
      const createdEvent = await eventService.createEvent({
        ...formData,
        eventImageUrl: finalImageUrl,
        finalPlaceId: selectedPlace?.placeId // Include selected place if any
      });
      
      navigate(`/user/events/${createdEvent.eventId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + MIN_ADVANCE_DAYS);
  const minDateString = minDate.toISOString().split("T")[0];

  // Search places function
  const searchPlaces = async () => {
    setLoadingPlaces(true);
    try {
      if (!placeSearchQuery.trim()) {
        // Load all places from user's branch
        const response = await axiosInstance.get('/Place/get-all-place-by-branch', {
          params: {
            Page: 1,
            PageSize: 50,
          },
        });

        if (response.data && response.data.items) {
          const places = response.data.items.map((item: any) => {
            const placeData = item.placeDetail || item.PlaceDetail || item;
            return {
              placeId: placeData.PlaceId || placeData.placeId,
              name: placeData.Name || placeData.name,
              addressLine1: placeData.AddressLine1 || placeData.addressLine1 || '',
              categoryName: placeData.CategoryName || placeData.categoryName,
            };
          });
          setAvailablePlaces(places);
        } else {
          setAvailablePlaces([]);
        }
        return;
      }

      // Search places by name
      const response = await axiosInstance.post('/Place/search', {
        name: placeSearchQuery,
        Page: 1,
        PageSize: 50,
      });

      if (response.data && response.data.items) {
        const places = response.data.items.map((item: any) => {
          const placeData = item.placeDetail || item.PlaceDetail || item;
          return {
            placeId: placeData.PlaceId || placeData.placeId,
            name: placeData.Name || placeData.name,
            addressLine1: placeData.AddressLine1 || placeData.addressLine1 || '',
            categoryName: placeData.CategoryName || placeData.categoryName,
          };
        });
        setAvailablePlaces(places);
      } else {
        setAvailablePlaces([]);
      }
    } catch (error: any) {
      console.error('Error searching places:', error);
      setAvailablePlaces([]);
      setError('Failed to search places: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingPlaces(false);
    }
  };

  // Load places on mount if selector is open
  useEffect(() => {
    if (showPlaceSelector && availablePlaces.length === 0 && !loadingPlaces) {
      searchPlaces();
    }
  }, [showPlaceSelector]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Create Group Event
            </h1>
            <p className="text-gray-600 text-sm">Plan an amazing event with AI recommendations</p>
          </div>
        </div>
      </motion.div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-4 shadow-md"
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <p className="font-medium text-sm">{error}</p>
          </div>
        </motion.div>
      )}

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        onSubmit={handleSubmit}
        className="bg-white shadow-xl rounded-2xl p-6 space-y-6 border border-gray-100"
      >
        {/* Event Cover Image Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 bg-gradient-to-b from-purple-500 to-pink-600 rounded-full"></div>
            <h2 className="text-base font-semibold text-gray-800">Event Cover Image</h2>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {eventImagePreview ? (
                  <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-gray-300 shadow-sm group">
                    <img
                      src={eventImagePreview}
                      alt="Event preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveEventImage}
                      className="absolute top-1 right-1 h-5 w-5 p-0 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-24 border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                  >
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEventImageChange}
                  className="hidden"
                />
              </div>
              <div className="flex-1 flex flex-col gap-2">
                {!eventImagePreview && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all text-xs font-medium flex items-center gap-1.5"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateEventImage}
                      disabled={generatingImage || !formData.title}
                      className="px-3 py-1.5 bg-white border border-purple-300 text-purple-700 rounded-md hover:bg-purple-50 hover:border-purple-400 transition-all text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingImage ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          Generate AI
                        </>
                      )}
                    </button>
                  </div>
                )}
                {eventImagePreview && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-fit px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all text-xs font-medium flex items-center gap-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Change
                  </button>
                )}
                <p className="text-xs text-gray-500 leading-relaxed">
                  Optional: Upload an image or generate one with AI
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Event Details Section - All in one */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-1 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
            <h2 className="text-lg font-semibold text-gray-800">Event Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Event Title - Full Width */}
            <motion.div 
              className="lg:col-span-2"
              whileHover={{ scale: 1.005 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Event Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 text-sm"
                placeholder="e.g., Team Lunch at Downtown"
                maxLength={200}
                required
              />
            </motion.div>

            {/* Event Type */}
            <motion.div
              whileHover={{ scale: 1.005 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 text-purple-500" />
                Event Type <span className="text-red-500">*</span>
              </label>
              <select
                name="eventType"
                value={formData.eventType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 bg-white text-sm"
                required
              >
                <option value="">Select type</option>
                {EVENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </motion.div>

            {/* Description - Reduced height */}
            <motion.div
              className="lg:col-span-1"
              whileHover={{ scale: 1.005 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 text-green-500" />
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 resize-none text-sm"
                placeholder="Event details..."
              />
            </motion.div>

            {/* Date */}
            <motion.div
              whileHover={{ scale: 1.005 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleInputChange}
                min={minDateString}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 text-sm"
                required
              />
            </motion.div>

            {/* Time */}
            <motion.div
              whileHover={{ scale: 1.005 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 text-purple-500" />
                Time <span className="text-red-500">*</span>
              </label>
              <div className="inline-flex items-center gap-1 px-2 py-1 border-2 border-gray-300 rounded-md hover:border-orange-300 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500 transition-all duration-200 bg-white">
                {(() => {
                  const time12h = convert24hTo12h(formData.scheduledTime)
                  return (
                    <>
                      <div className="relative">
                        <select
                          value={time12h.hour}
                          onChange={(e) => handleScheduledTimeHourChange(e.target.value)}
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
                          onChange={(e) => handleScheduledTimeMinuteChange(e.target.value)}
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
                          onChange={(e) => handleScheduledTimePeriodChange(e.target.value)}
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
            </motion.div>

            {/* Expected Attendees */}
            <motion.div
              whileHover={{ scale: 1.005 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 text-green-500" />
                Attendees <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="expectedAttendees"
                value={formData.expectedAttendees}
                onChange={handleInputChange}
                min={2}
                max={MAX_EXPECTED_ATTENDEES}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 text-sm"
                required
              />
            </motion.div>

            {/* Duration */}
            <motion.div
              whileHover={{ scale: 1.005 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Timer className="w-4 h-4 text-orange-500" />
                Duration (hrs)
              </label>
              <input
                type="number"
                name="estimatedDuration"
                value={formData.estimatedDuration || ""}
                onChange={handleInputChange}
                min={1.1}
                max={12}
                step="0.1"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 text-sm"
                placeholder="2"
              />
            </motion.div>

            {/* Total Budget */}
            <motion.div
              whileHover={{ scale: 1.005 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                Total Budget (USD)
              </label>
              <input
                type="number"
                name="budgetTotal"
                value={formData.budgetTotal || ""}
                onChange={handleInputChange}
                onBlur={(e) => {
                  const total = Number(e.target.value);
                  const minBudget = formData.expectedAttendees * MIN_BUDGET_PER_PERSON;
                  if (total > 0 && total < minBudget) {
                    setError(`Total budget must be at least $${minBudget} USD (${MIN_BUDGET_PER_PERSON} USD per person × ${formData.expectedAttendees} attendees)`);
                  }
                }}
                step="0.01"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 text-sm"
                placeholder="Auto-calculated"
              />
            </motion.div>

            {/* Budget Per Person */}
            <motion.div
              whileHover={{ scale: 1.005 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Per Person (USD)
              </label>
              <input
                type="number"
                name="budgetPerPerson"
                value={formData.budgetPerPerson || ""}
                onChange={handleInputChange}
                onBlur={(e) => {
                  const perPerson = Number(e.target.value);
                  if (perPerson > 0 && perPerson < MIN_BUDGET_PER_PERSON) {
                    setError(`Budget per person must be at least $${MIN_BUDGET_PER_PERSON} USD`);
                  }
                }}
                step="0.01"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 text-sm"
                placeholder="Auto-calculated"
              />
            </motion.div>

            {/* Acceptance Threshold */}
            <motion.div
              whileHover={{ scale: 1.005 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 text-indigo-500" />
                Acceptance Threshold (%)
              </label>
              <input
                type="number"
                name="acceptanceThreshold"
                value={formData.acceptanceThreshold ? Math.round(formData.acceptanceThreshold * 100) : ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    acceptanceThreshold: value ? parseFloat(value) / 100 : 0.7
                  }));
                  setError(""); // Clear error
                }}
                min={10}
                max={100}
                step={5}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 text-sm"
                placeholder="70"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum % of participants that must accept (default: 70%)
              </p>
            </motion.div>

            {/* Privacy Setting */}
            <motion.div
              className="lg:col-span-2"
              whileHover={{ scale: 1.005 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Lock className="w-4 h-4 text-purple-500" />
                Privacy Setting <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="privacy"
                    value="Public"
                    checked={formData.privacy === "Public"}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, privacy: e.target.value }));
                      setError("");
                    }}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">Public</span>
                    <span className="text-xs text-gray-500">(Visible to all users in branch)</span>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="privacy"
                    value="Private"
                    checked={formData.privacy === "Private"}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, privacy: e.target.value }));
                      setError("");
                    }}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-700">Private</span>
                    <span className="text-xs text-gray-500">(Only organizer & invited participants)</span>
                  </div>
                </label>
              </div>
            </motion.div>
          </div>

          {/* Info text about budget calculation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              <strong>Tip:</strong> Enter either Total Budget or Per Person budget - the other will be calculated automatically based on number of attendees.
            </p>
          </div>
        </div>

        {/* Venue Selection Section - Optional */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
            <h2 className="text-base font-semibold text-gray-800">Venue Selection (Optional)</h2>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            {!selectedPlace ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  You can either:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-blue-500 font-semibold">Option 1:</span>
                    <span>Skip venue selection now and use AI recommendations + voting later (default flow)</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 font-semibold">Option 2:</span>
                    <span>Select a venue directly now to skip AI recommendations and voting</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPlaceSelector(true)}
                  className="w-full px-4 py-2 bg-white border-2 border-green-500 text-green-700 rounded-lg hover:bg-green-50 hover:border-green-600 transition-all text-sm font-medium flex items-center justify-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Select Venue Directly
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-gray-900">{selectedPlace.name}</span>
                    </div>
                    {selectedPlace.address && (
                      <p className="text-xs text-gray-600 ml-7">{selectedPlace.address}</p>
                    )}
                    <p className="text-xs text-green-700 ml-7 mt-1">Event will be created with this venue confirmed</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlace(null);
                      setFormData(prev => ({ ...prev, finalPlaceId: undefined }));
                    }}
                    className="ml-2 px-3 py-1.5 text-xs bg-white border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-all"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* Place Selector Modal */}
            {showPlaceSelector && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Select Venue</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPlaceSelector(false);
                        setPlaceSearchQuery("");
                        setAvailablePlaces([]);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={placeSearchQuery}
                        onChange={(e) => setPlaceSearchQuery(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            await searchPlaces();
                          }
                        }}
                        placeholder="Search for a place..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={searchPlaces}
                      disabled={loadingPlaces}
                      className="mt-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {loadingPlaces ? "Searching..." : "Search Places"}
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {loadingPlaces ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-green-600" />
                        <p className="text-sm text-gray-600 mt-2">Loading places...</p>
                      </div>
                    ) : availablePlaces.length === 0 ? (
                      <div className="text-center py-8">
                        <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">No places found. Try searching.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {availablePlaces.map((place) => (
                          <div
                            key={place.placeId}
                            className="p-3 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div
                                className="flex-1 cursor-pointer"
                                onClick={() => {
                                  setSelectedPlace({
                                    placeId: place.placeId,
                                    name: place.name,
                                    address: place.addressLine1
                                  });
                                  setFormData(prev => ({ ...prev, finalPlaceId: place.placeId }));
                                  setShowPlaceSelector(false);
                                  setPlaceSearchQuery("");
                                  setAvailablePlaces([]);
                                }}
                              >
                                <div className="font-medium text-gray-900">{place.name}</div>
                                {place.addressLine1 && (
                                  <div className="text-xs text-gray-600 mt-1">{place.addressLine1}</div>
                                )}
                                {place.categoryName && (
                                  <div className="text-xs text-gray-500 mt-1">{place.categoryName}</div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setLoadingPlaceDetail(true);
                                  setShowPlaceDetail(true);
                                  try {
                                    const detail = await ViewDetailPlace({ placeId: place.placeId });
                                    setSelectedPlaceDetail(detail);
                                  } catch (error: any) {
                                    console.error('Error loading place detail:', error);
                                    setError('Failed to load place details: ' + (error.response?.data?.message || error.message));
                                    setShowPlaceDetail(false);
                                  } finally {
                                    setLoadingPlaceDetail(false);
                                  }
                                }}
                                className="px-3 py-1.5 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-all flex items-center gap-1.5 flex-shrink-0"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                View Details
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Place Detail Modal - Premium Design */}
        {showPlaceDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => {
              setShowPlaceDetail(false);
              setSelectedPlaceDetail(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100"
            >
              {/* Premium Header with Gradient */}
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Place Details</h3>
                    <p className="text-sm text-white/80 mt-0.5">View comprehensive information</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPlaceDetail(false);
                    setSelectedPlaceDetail(null);
                  }}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center justify-center text-white transition-all hover:scale-110"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {loadingPlaceDetail ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl mb-4">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Loading place details...</p>
                  </div>
                ) : selectedPlaceDetail ? (
                  <div className="p-6 space-y-6">
                    {/* Header Section */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                            {selectedPlaceDetail.name || selectedPlaceDetail.Name}
                          </h4>
                          {selectedPlaceDetail.categoryName && (
                            <div className="mt-2">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border border-purple-200">
                                {selectedPlaceDetail.categoryName}
                              </span>
                            </div>
                          )}
                        </div>
                        {(selectedPlaceDetail.averageRating || selectedPlaceDetail.AverageRating) && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                            <div>
                              <div className="text-lg font-bold text-gray-900">
                                {selectedPlaceDetail.averageRating || selectedPlaceDetail.AverageRating}
                              </div>
                              {selectedPlaceDetail.totalReviews && (
                                <div className="text-xs text-gray-600">
                                  {selectedPlaceDetail.totalReviews} reviews
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Image Gallery - Premium Design */}
                    {selectedPlaceDetail.imageUrls && selectedPlaceDetail.imageUrls.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {selectedPlaceDetail.imageUrls.slice(0, 4).map((img: any, idx: number) => (
                          <div
                            key={idx}
                            className={`relative overflow-hidden rounded-xl ${
                              idx === 0 ? 'col-span-2 row-span-2' : ''
                            } group cursor-pointer`}
                          >
                            <img
                              src={img.imageUrl || img.ImageUrl}
                              alt={img.altText || img.AltText || 'Place image'}
                              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${
                                idx === 0 ? 'h-64' : 'h-32'
                              }`}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Description Card */}
                    {selectedPlaceDetail.description && (
                      <div className="p-5 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border border-gray-100">
                        <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          Description
                        </h5>
                        <p className="text-sm text-gray-700 leading-relaxed">{selectedPlaceDetail.description}</p>
                      </div>
                    )}

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Address Card */}
                      {selectedPlaceDetail.addressLine1 && (
                        <div className="p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <MapPin className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Address</h5>
                              <p className="text-sm font-medium text-gray-900 leading-relaxed">
                                {selectedPlaceDetail.addressLine1}
                                {selectedPlaceDetail.city && `, ${selectedPlaceDetail.city}`}
                                {selectedPlaceDetail.stateProvince && `, ${selectedPlaceDetail.stateProvince}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Opening Hours Card */}
                      {(selectedPlaceDetail.openTime || selectedPlaceDetail.closeTime) && (
                        <div className="p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Clock className="h-5 w-5 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Opening Hours</h5>
                              <p className="text-sm font-medium text-gray-900">
                                {convertUtcToLocalTime(selectedPlaceDetail.openTime, localStorage.getItem('timezone')) || 'N/A'} - {convertUtcToLocalTime(selectedPlaceDetail.closeTime, localStorage.getItem('timezone')) || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Phone Card */}
                      {selectedPlaceDetail.phoneNumber && (
                        <div className="p-4 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Phone className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone</h5>
                              <a
                                href={`tel:${selectedPlaceDetail.phoneNumber}`}
                                className="text-sm font-medium text-gray-900 hover:text-green-600 transition-colors"
                              >
                                {selectedPlaceDetail.phoneNumber}
                              </a>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Website Card */}
                      {selectedPlaceDetail.websiteUrl && (
                        <div className="p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Globe className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Website</h5>
                              <a
                                href={selectedPlaceDetail.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-blue-600 hover:text-indigo-600 hover:underline transition-colors break-all"
                              >
                                {selectedPlaceDetail.websiteUrl}
                              </a>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Price Level Card */}
                      {selectedPlaceDetail.priceLevel && (
                        <div className="p-4 bg-white rounded-xl border border-gray-200 hover:border-yellow-300 hover:shadow-md transition-all">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <DollarSign className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Price Level</h5>
                              <p className="text-sm font-medium text-gray-900">
                                <span className="text-yellow-600 font-bold">{'$'.repeat(selectedPlaceDetail.priceLevel)}</span>
                                <span className="text-gray-500 ml-2">
                                  {'$'.repeat(4 - selectedPlaceDetail.priceLevel)}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <MapPin className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">No details available</p>
                  </div>
                )}
              </div>

              {/* Premium Footer */}
              <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30 flex justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowPlaceDetail(false);
                    setSelectedPlaceDetail(null);
                  }}
                  className="px-6 py-2.5 text-sm font-medium bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow-md"
                >
                  Close
                </button>
                {selectedPlaceDetail && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlace({
                        placeId: selectedPlaceDetail.placeId || selectedPlaceDetail.PlaceId,
                        name: selectedPlaceDetail.name || selectedPlaceDetail.Name,
                        address: selectedPlaceDetail.addressLine1 || selectedPlaceDetail.AddressLine1
                      });
                      setFormData(prev => ({ 
                        ...prev, 
                        finalPlaceId: selectedPlaceDetail.placeId || selectedPlaceDetail.PlaceId 
                      }));
                      setShowPlaceDetail(false);
                      setShowPlaceSelector(false);
                      setPlaceSearchQuery("");
                      setAvailablePlaces([]);
                    }}
                    className="px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Select This Venue
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
          <motion.button
            type="button"
            onClick={() => navigate("/user/events")}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Cancel
          </motion.button>
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creating Event...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Create Event</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.form>
    </div>
  );
};

export default CreateEventPage;


