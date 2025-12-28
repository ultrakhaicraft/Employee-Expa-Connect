import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Users, DollarSign, Edit, Image as ImageIcon, Upload, Loader2, X, Sparkles, Lock, Globe, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import eventService from '../../services/eventService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { EventResponse } from '../../types/event.types';
import {
  EVENT_TYPES,
  MIN_EXPECTED_ATTENDEES,
  MAX_EXPECTED_ATTENDEES,
  MIN_BUDGET_PER_PERSON,
  MIN_ADVANCE_DAYS,
} from '../../constants/eventConstants';
import { convertUtcToLocalTime, getTimezoneFromStorage } from '../../utils/timezone';

interface UpdateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventResponse;
  onUpdate: (data: any) => Promise<void>;
}

const UpdateEventModal: React.FC<UpdateEventModalProps> = ({
  isOpen,
  onClose,
  event,
  onUpdate,
}) => {
  const [loading, setLoading] = useState(false);
  const [eventImagePreview, setEventImagePreview] = useState<string | null>(null);
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: '',
    scheduledDate: '',
    scheduledTime: '',
    expectedAttendees: MIN_EXPECTED_ATTENDEES,
    budgetTotal: 0,
    budgetPerPerson: 0,
    estimatedDuration: 2,
    privacy: 'Public' as 'Public' | 'Private',
  });

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
      toast.error("Time must be between 7:00 AM and 10:00 PM")
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
      toast.error("Time must be between 7:00 AM and 10:00 PM")
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
      toast.error("Time must be between 7:00 AM and 10:00 PM")
    }
    setFormData(prev => ({ ...prev, scheduledTime: time24h }))
  }

  useEffect(() => {
    if (isOpen && event) {
      // Convert UTC time from DB to local timezone for display
      const timezone = event.timezone || getTimezoneFromStorage() || 'UTC+07:00';
      const localTime = event.scheduledTime 
        ? convertUtcToLocalTime(event.scheduledTime, timezone)
        : '';
      
      setFormData({
        title: event.title || '',
        description: event.description || '',
        eventType: event.eventType || '',
        scheduledDate: event.scheduledDate?.split('T')[0] || '',
        scheduledTime: localTime,
        expectedAttendees: event.expectedAttendees || MIN_EXPECTED_ATTENDEES,
        budgetTotal: event.budgetTotal || 0,
        budgetPerPerson: event.budgetPerPerson || 0,
        estimatedDuration: 2,
        privacy: (event.privacy as 'Public' | 'Private') || 'Public',
      });
      
      // Load existing event image if available
      const existingImageUrl = event.eventImageUrl && event.eventImageUrl.trim() !== '' 
        ? event.eventImageUrl 
        : null;
      setEventImagePreview(existingImageUrl);
      setEventImageFile(null);
    }
  }, [isOpen, event]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    // Validate time range (7:00 AM - 10:00 PM)
    if (name === "scheduledTime" && value !== "") {
      const [hours, minutes] = value.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes;
      const minMinutes = 7 * 60; // 7:00 AM
      const maxMinutes = 22 * 60; // 10:00 PM (22:00)
      
      if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
        toast.error("Time must be between 7:00 AM and 10:00 PM");
        return;
      }
    }
    
    // Validate expected attendees (must be > 1)
    if (name === "expectedAttendees" && value !== "") {
      const attendees = Number(value);
      if (attendees <= 1) {
        toast.error("Attendees must be greater than 1");
        return;
      }
      if (attendees > MAX_EXPECTED_ATTENDEES) {
        toast.error(`Attendees cannot exceed ${MAX_EXPECTED_ATTENDEES}`);
        return;
      }
      
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
          toast.error(`Budget per person must be at least $${MIN_BUDGET_PER_PERSON} USD`);
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
        toast.error("Duration must be greater than 1 hour");
        return;
      }
      if (duration > 12) {
        toast.error("Duration cannot exceed 12 hours");
        return;
      }
    }

    // Auto-calculate budget fields (USD - 2 decimal places)
    if (name === "budgetTotal" && value !== "") {
      const total = Number(value);
      const minBudget = formData.expectedAttendees * MIN_BUDGET_PER_PERSON;
      
      // ✅ Cho phép nhập tự do, không chặn input
      const perPerson = formData.expectedAttendees > 0 
        ? Number((total / formData.expectedAttendees).toFixed(2))
        : 0;
      setFormData((prev) => ({
        ...prev,
        budgetTotal: total,
        budgetPerPerson: perPerson,
      }));
      
      // Chỉ hiển thị warning, không chặn
      if (total > 0 && total < minBudget) {
        // Không hiển thị toast khi đang nhập, chỉ validate khi blur
      }
      return;
    }
    
    if (name === "budgetPerPerson" && value !== "") {
      const perPerson = Number(value);
      
      // ✅ Cho phép nhập tự do, không chặn input
      const total = formData.expectedAttendees > 0 
        ? Number((perPerson * formData.expectedAttendees).toFixed(2))
        : 0;
      setFormData((prev) => ({
        ...prev,
        budgetPerPerson: perPerson,
        budgetTotal: total,
      }));
      
      // Chỉ hiển thị warning, không chặn
      if (perPerson > 0 && perPerson < MIN_BUDGET_PER_PERSON) {
        // Không hiển thị toast khi đang nhập, chỉ validate khi blur
      }
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'expectedAttendees' ||
        name === 'budgetTotal' ||
        name === 'budgetPerPerson' ||
        name === 'estimatedDuration'
          ? value === ''
            ? 0
            : Number(value)
          : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast.error('Event title is required');
      return false;
    }

    if (!formData.eventType) {
      toast.error('Please select an event type');
      return false;
    }

    if (!formData.scheduledDate) {
      toast.error('Please select a date');
      return false;
    }

    if (!formData.scheduledTime) {
      toast.error('Please select a time');
      return false;
    }

    // Validate time range (7:00 AM - 10:00 PM)
    const [hours, minutes] = formData.scheduledTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes;
    const minMinutes = 7 * 60; // 7:00 AM
    const maxMinutes = 22 * 60; // 10:00 PM (22:00)
    
    if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
      toast.error("Time must be between 7:00 AM and 10:00 PM");
      return false;
    }

    // Validate date is at least 3 days in advance
    const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + MIN_ADVANCE_DAYS);

    if (scheduledDateTime < minDate) {
      toast.error(`Event must be scheduled at least ${MIN_ADVANCE_DAYS} days in advance`);
      return false;
    }

    if (
      formData.expectedAttendees < MIN_EXPECTED_ATTENDEES ||
      formData.expectedAttendees > MAX_EXPECTED_ATTENDEES
    ) {
      toast.error(
        `Expected attendees must be between ${MIN_EXPECTED_ATTENDEES} and ${MAX_EXPECTED_ATTENDEES}`
      );
      return false;
    }

    // BR_EVENT_03: Budget Validation
    if (formData.budgetTotal && formData.budgetTotal > 0) {
      const requiredBudget = formData.expectedAttendees * MIN_BUDGET_PER_PERSON;
      if (formData.budgetTotal < requiredBudget) {
        toast.error(
          `Budget too low. Minimum $${MIN_BUDGET_PER_PERSON} USD per person required. Total budget must be at least $${requiredBudget} USD.`
        );
        return false;
      }
    }

    // Check if budget per person is valid if provided
    if (formData.budgetPerPerson && formData.budgetPerPerson > 0) {
      if (formData.budgetPerPerson < MIN_BUDGET_PER_PERSON) {
        toast.error(
          `Budget per person must be at least $${MIN_BUDGET_PER_PERSON} USD.`
        );
        return false;
      }
    }

    return true;
  };

  const handleEventImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image must be less than 10MB");
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
      toast.error("Event title is required to generate an image");
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
      toast.success("✨ AI-generated event image created!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate image");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if event can be updated (not cancelled or completed)
    if (event.status?.toLowerCase() === 'cancelled' || event.status?.toLowerCase() === 'completed') {
      toast.error('Cannot update a cancelled or completed event');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      // Handle image upload if file is selected
      let finalImageUrl: string | undefined = undefined;
      
      if (eventImageFile && event.eventId) {
        try {
          finalImageUrl = await eventService.uploadEventImage(event.eventId, eventImageFile);
        } catch (uploadError: any) {
          toast.error("Failed to upload image: " + (uploadError.message || "Unknown error"));
          setLoading(false);
          return;
        }
      } else if (eventImagePreview && !eventImageFile) {
        // Use generated or existing image URL
        finalImageUrl = eventImagePreview;
      }
      
      // Update event with image URL if available
      await onUpdate({
        ...formData,
        eventImageUrl: finalImageUrl
      });
      
      toast.success('Event updated successfully!');
      onClose();
    } catch (error: any) {
      toast.error('Failed to update event: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + MIN_ADVANCE_DAYS);
  const minDateString = minDate.toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <Edit className="mr-2 h-6 w-6 text-blue-600" />
            Update Event
          </DialogTitle>
          <DialogDescription>
            Make changes to your event details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Cover Image */}
          <div className="space-y-2">
            <Label>Event Cover Image</Label>
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

          {/* Event Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Team Lunch at Downtown"
              maxLength={200}
              required
            />
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="eventType">Event Type *</Label>
            <Select
              value={formData.eventType}
              onValueChange={(value) => handleSelectChange('eventType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledDate" className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Date *
              </Label>
              <Input
                id="scheduledDate"
                name="scheduledDate"
                type="date"
                value={formData.scheduledDate}
                onChange={handleInputChange}
                min={minDateString}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledTime" className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Time *
              </Label>
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
            </div>
          </div>

          {/* Expected Attendees and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expectedAttendees" className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                Expected Attendees *
              </Label>
              <Input
                id="expectedAttendees"
                name="expectedAttendees"
                type="number"
                value={formData.expectedAttendees}
                onChange={handleInputChange}
                min={2}
                max={MAX_EXPECTED_ATTENDEES}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedDuration">Duration (hours)</Label>
              <Input
                id="estimatedDuration"
                name="estimatedDuration"
                type="number"
                value={formData.estimatedDuration}
                onChange={handleInputChange}
                min={1.1}
                max={12}
                step="0.1"
                placeholder="2"
              />
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budgetTotal" className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                Total Budget (USD)
              </Label>
              <Input
                id="budgetTotal"
                name="budgetTotal"
                type="number"
                value={formData.budgetTotal}
                onChange={handleInputChange}
                onBlur={(e) => {
                  const total = Number(e.target.value);
                  const minBudget = formData.expectedAttendees * MIN_BUDGET_PER_PERSON;
                  if (total > 0 && total < minBudget) {
                    toast.warning(`Total budget should be at least $${minBudget} USD (${MIN_BUDGET_PER_PERSON} USD per person × ${formData.expectedAttendees} attendees)`);
                  }
                }}
                step="0.01"
                placeholder="e.g., 1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetPerPerson">Budget Per Person (USD)</Label>
              <Input
                id="budgetPerPerson"
                name="budgetPerPerson"
                type="number"
                value={formData.budgetPerPerson}
                onChange={handleInputChange}
                onBlur={(e) => {
                  const perPerson = Number(e.target.value);
                  if (perPerson > 0 && perPerson < MIN_BUDGET_PER_PERSON) {
                    toast.warning(`Budget per person should be at least $${MIN_BUDGET_PER_PERSON} USD`);
                  }
                }}
                placeholder="e.g., 50"
              />
            </div>
          </div>

          {/* Privacy Setting */}
          <div className="space-y-2">
            <Label htmlFor="privacy" className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-500" />
              Privacy Setting
            </Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="privacy"
                  value="Public"
                  checked={formData.privacy === "Public"}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, privacy: e.target.value as 'Public' | 'Private' }));
                  }}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Public</span>
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
                    setFormData(prev => ({ ...prev, privacy: e.target.value as 'Public' | 'Private' }));
                  }}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Private</span>
                  <span className="text-xs text-gray-500">(Only organizer & invited participants)</span>
                </div>
              </label>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              placeholder="Add any additional details about the event..."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
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
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Update Event
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateEventModal;

















