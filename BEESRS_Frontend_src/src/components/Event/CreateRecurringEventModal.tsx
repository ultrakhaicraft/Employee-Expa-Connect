import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Repeat, 
  Clock, 
  Users, 
  DollarSign, 
  Info,
  Loader2,
  CalendarDays,
  Zap,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import eventService from '../../services/eventService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { MIN_BUDGET_PER_PERSON } from '../../constants/eventConstants';
import { checkConflictWithParticipatingEvents, formatConflictingEvents } from '../../utils/eventConflictChecker';
import type { EventResponse } from '../../types/event.types';
import { convertUtcToLocalTime, getTimezoneFromStorage } from '../../utils/timezone';

interface CreateRecurringEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any; // For edit mode
}

const CreateRecurringEventModal: React.FC<CreateRecurringEventModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  // Parse daysOfWeek string to array
  const parseDaysOfWeek = (daysString: string): string[] => {
    if (!daysString) return [];
    try {
      // Try to parse as JSON array first
      const parsed = JSON.parse(daysString);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // If not JSON, treat as comma-separated string
      return daysString.split(',').map(day => day.trim()).filter(day => day);
    }
    return [];
  };

  // Convert array to string format for backend
  const formatDaysOfWeek = (daysArray: string[]): string => {
    if (daysArray.length === 0) return '';
    // Use JSON array format for backend
    return JSON.stringify(daysArray);
  };

  const initialDaysOfWeek = initialData?.daysOfWeek ? parseDaysOfWeek(initialData.daysOfWeek) : [];

  // Convert UTC time from DB to local timezone for display when editing
  const getInitialTime = () => {
    if (initialData?.scheduledTime) {
      const timezone = getTimezoneFromStorage() || 'UTC+07:00';
      return convertUtcToLocalTime(initialData.scheduledTime, timezone);
    }
    return '12:00';
  };

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    eventType: initialData?.eventType || 'Team Gathering',
    recurrencePattern: initialData?.recurrencePattern || 'weekly',
    daysOfWeek: initialData?.daysOfWeek || '',
    selectedDaysOfWeek: initialDaysOfWeek, // Array for UI
    dayOfMonth: initialData?.dayOfMonth || 1,
    scheduledTime: getInitialTime(),
    estimatedDuration: initialData?.estimatedDuration || 2,
    expectedAttendees: initialData?.expectedAttendees || 10,
    budgetPerPerson: initialData?.budgetPerPerson || 50,
    budgetTotal: initialData?.expectedAttendees && initialData?.budgetPerPerson 
      ? Number((initialData.expectedAttendees * initialData.budgetPerPerson).toFixed(2))
      : (initialData?.expectedAttendees || 10) * (initialData?.budgetPerPerson || 50), // Tính từ đầu
    startDate: initialData?.startDate ? initialData.startDate.split('T')[0] : '',
    endDate: initialData?.endDate ? initialData.endDate.split('T')[0] : '',
    occurrenceCount: initialData?.occurrenceCount || 0,
    autoCreateEvents: initialData?.autoCreateEvents !== undefined ? initialData.autoCreateEvents : true,
    daysInAdvance: initialData?.daysInAdvance || 7,
  });

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      const parsedDays = initialData.daysOfWeek ? parseDaysOfWeek(initialData.daysOfWeek) : [];
      const expectedAttendees = initialData.expectedAttendees || 10;
      const budgetPerPerson = initialData.budgetPerPerson || 50;
      // Convert UTC time from DB to local timezone for display
      const timezone = getTimezoneFromStorage() || 'UTC+07:00';
      const localTime = initialData.scheduledTime 
        ? convertUtcToLocalTime(initialData.scheduledTime, timezone)
        : '12:00';
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        eventType: initialData.eventType || 'Team Gathering',
        recurrencePattern: initialData.recurrencePattern || 'weekly',
        daysOfWeek: initialData.daysOfWeek || '',
        selectedDaysOfWeek: parsedDays,
        dayOfMonth: initialData.dayOfMonth || 1,
        scheduledTime: localTime,
        estimatedDuration: initialData.estimatedDuration || 2,
        expectedAttendees: expectedAttendees,
        budgetPerPerson: budgetPerPerson,
        budgetTotal: Number((expectedAttendees * budgetPerPerson).toFixed(2)),
        startDate: initialData.startDate ? initialData.startDate.split('T')[0] : '',
        endDate: initialData.endDate ? initialData.endDate.split('T')[0] : '',
        occurrenceCount: initialData.occurrenceCount || 0,
        autoCreateEvents: initialData.autoCreateEvents !== undefined ? initialData.autoCreateEvents : true,
        daysInAdvance: initialData.daysInAdvance || 7,
      });
    }
  }, [initialData]);

  const [loading, setLoading] = useState(false);
  const [participatingEvents, setParticipatingEvents] = useState<EventResponse[]>([]);
  const [conflictWarnings, setConflictWarnings] = useState<Array<{ date: string; conflicts: EventResponse[] }>>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // Load participating events when modal opens
  useEffect(() => {
    if (isOpen) {
      loadParticipatingEvents();
    }
  }, [isOpen]);

  // Check conflicts when relevant fields change
  useEffect(() => {
    if (formData.startDate && formData.scheduledTime && formData.autoCreateEvents && participatingEvents.length > 0) {
      checkRecurringConflicts();
    } else {
      setConflictWarnings([]);
    }
  }, [formData.startDate, formData.scheduledTime, formData.recurrencePattern, formData.selectedDaysOfWeek, formData.dayOfMonth, formData.autoCreateEvents, participatingEvents]);

  const loadParticipatingEvents = async () => {
    try {
      const events = await eventService.getParticipatingEvents();
      const upcomingEvents = events.filter(e => 
        e.status !== 'cancelled' && 
        e.status !== 'draft' &&
        new Date(`${e.scheduledDate}T${e.scheduledTime}`) >= new Date()
      );
      setParticipatingEvents(upcomingEvents);
    } catch (error) {
      console.error('Failed to load participating events:', error);
    }
  };

  const checkRecurringConflicts = async () => {
    if (!formData.startDate || !formData.scheduledTime || !formData.autoCreateEvents) {
      setConflictWarnings([]);
      return;
    }

    setCheckingConflicts(true);
    try {
      const warnings: Array<{ date: string; conflicts: EventResponse[] }> = [];
      
      // Check conflicts for the first 5 occurrences
      const occurrences = calculateNextOccurrences(5);
      
      for (const occurrenceDate of occurrences) {
        const conflict = checkConflictWithParticipatingEvents(
          occurrenceDate,
          formData.scheduledTime,
          formData.estimatedDuration,
          participatingEvents
        );
        
        if (conflict.hasConflict) {
          warnings.push({
            date: occurrenceDate,
            conflicts: conflict.conflictingEvents
          });
        }
      }
      
      setConflictWarnings(warnings);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setCheckingConflicts(false);
    }
  };

  const calculateNextOccurrences = (count: number): string[] => {
    const occurrences: string[] = [];
    const startDate = new Date(formData.startDate);
    let currentDate = new Date(startDate);
    let found = 0;

    while (found < count && currentDate <= new Date(startDate.getTime() + 60 * 24 * 60 * 60 * 1000)) { // Check up to 60 days ahead
      if (shouldGenerateForDate(currentDate)) {
        occurrences.push(currentDate.toISOString().split('T')[0]);
        found++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return occurrences;
  };

  const shouldGenerateForDate = (date: Date): boolean => {
    const pattern = formData.recurrencePattern.toLowerCase();
    
    switch (pattern) {
      case 'daily':
        return true;
      case 'weekly':
        if (formData.selectedDaysOfWeek.length === 0) return false;
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[date.getDay()];
        return formData.selectedDaysOfWeek.includes(dayName);
      case 'monthly':
        return date.getDate() === formData.dayOfMonth;
      case 'yearly':
        const startDate = new Date(formData.startDate);
        return date.getMonth() === startDate.getMonth() && date.getDate() === startDate.getDate();
      default:
        return false;
    }
  };

  // Validation function
  const validateForm = (): string | null => {
    // Validate required fields
    if (!formData.title.trim()) {
      return 'Event title is required';
    }
    
    if (!formData.startDate) {
      return 'Start date is required';
    }
    
    // Validate end date must be after start date
    if (formData.endDate && formData.endDate < formData.startDate) {
      return 'End date must be after or equal to start date';
    }
    
    // Validate start date must not be in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(formData.startDate);
    if (startDate < today) {
      return 'Start date cannot be in the past';
    }
    
    // Validate weekly pattern requires days of week
    if (formData.recurrencePattern === 'weekly' && formData.selectedDaysOfWeek.length === 0) {
      return 'Please select at least one day of the week for weekly recurrence';
    }
    
    // Validate monthly pattern requires day of month
    if (formData.recurrencePattern === 'monthly' && (!formData.dayOfMonth || formData.dayOfMonth < 1 || formData.dayOfMonth > 31)) {
      return 'Please select a valid day of month (1-31) for monthly recurrence';
    }
    
    // Validate expected attendees (must be > 1)
    if (formData.expectedAttendees <= 1) {
      return 'Expected attendees must be greater than 1';
    }
    
    // Validate duration (must be > 1 hour)
    if (formData.estimatedDuration && formData.estimatedDuration <= 1) {
      return 'Duration must be greater than 1 hour';
    }
    
    // Validate budget
    if (formData.budgetPerPerson && formData.budgetPerPerson < MIN_BUDGET_PER_PERSON) {
      return `Budget per person must be at least $${MIN_BUDGET_PER_PERSON} USD`;
    }
    
    // Validate occurrence count
    if (formData.occurrenceCount < 0) {
      return 'Occurrence count cannot be negative';
    }
    
    // Validate days in advance
    if (formData.autoCreateEvents && (formData.daysInAdvance < 1 || formData.daysInAdvance > 30)) {
      return 'Days in advance must be between 1 and 30';
    }
    
    // Validate time range (7:00 AM - 10:00 PM)
    if (formData.scheduledTime) {
      const [hours, minutes] = formData.scheduledTime.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes;
      const minMinutes = 7 * 60; // 7:00 AM
      const maxMinutes = 22 * 60; // 10:00 PM (22:00)
      
      if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
        return 'Time must be between 7:00 AM and 10:00 PM';
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Warn about conflicts if any
    if (conflictWarnings.length > 0 && formData.autoCreateEvents) {
      const conflictCount = conflictWarnings.length;
      const confirmMessage = `Warning: ${conflictCount} occurrence(s) of this recurring event will conflict with events you're participating in. The system will still create these events, but you may not be able to attend all of them. Do you want to continue?`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    try {
      setLoading(true);
      const submitData = {
        ...formData,
        scheduledTime: formData.scheduledTime + ':00',
        // Convert selectedDaysOfWeek array to daysOfWeek string format
        daysOfWeek: formData.recurrencePattern === 'weekly' 
          ? formatDaysOfWeek(formData.selectedDaysOfWeek)
          : formData.daysOfWeek,
        // Ensure endDate is null if empty
        endDate: formData.endDate || undefined,
      };
      // Remove selectedDaysOfWeek from submit data (it's only for UI)
      delete (submitData as any).selectedDaysOfWeek;

      if (initialData) {
        // Edit mode
        await eventService.updateRecurringEvent(initialData.recurringEventId, submitData);
        toast.success('Recurring event updated successfully!');
      } else {
        // Create mode
        await eventService.createRecurringEvent(submitData);
        toast.success('Recurring event created successfully!');
      }
      
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        title: '',
        description: '',
        eventType: 'Team Gathering',
        recurrencePattern: 'weekly',
        daysOfWeek: '',
        selectedDaysOfWeek: [],
        dayOfMonth: 1,
        scheduledTime: '12:00',
        estimatedDuration: 2,
        expectedAttendees: 10,
        budgetPerPerson: 50,
        budgetTotal: 500, // 10 * 50
        startDate: '',
        endDate: '',
        occurrenceCount: 0,
        autoCreateEvents: true,
        daysInAdvance: 7,
      });
    } catch (error: any) {
      toast.error('Failed to create recurring event: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        {/* Header with gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 px-8 py-6">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <Repeat className="h-6 w-6 text-white" />
              </div>
              <div>
              <DialogTitle className="text-2xl font-bold text-white">
                {initialData ? 'Edit Recurring Event' : 'Create Recurring Event'}
              </DialogTitle>
              <DialogDescription className="text-purple-50 mt-1">
                {initialData ? 'Update your recurring event settings' : 'Set up automatic event scheduling for your recurring activities'}
              </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-10 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Basic Information Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Basic Information</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Event Title <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Weekly Team Lunch"
                      className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Regular team lunch to catch up..."
                      className="resize-none bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eventType" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Event Type
                    </Label>
                    <Select
                      value={formData.eventType}
                      onValueChange={(value) => setFormData({ ...formData, eventType: value })}
                    >
                      <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Team Gathering">Team Gathering</SelectItem>
                        <SelectItem value="Team Lunch">Team Lunch</SelectItem>
                        <SelectItem value="Team Dinner">Team Dinner</SelectItem>
                        <SelectItem value="Team Building">Team Building</SelectItem>
                        <SelectItem value="Happy Hour">Happy Hour</SelectItem>
                        <SelectItem value="Meeting">Meeting</SelectItem>
                        <SelectItem value="Workshop">Workshop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Recurrence Pattern Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                    <Repeat className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Recurrence Pattern</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Repeat <span className="text-rose-500">*</span>
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((pattern) => (
                        <button
                          key={pattern}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, recurrencePattern: pattern.toLowerCase() })
                          }
                          className={`px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                            formData.recurrencePattern === pattern.toLowerCase()
                              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25'
                              : 'bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-purple-300 dark:hover:border-purple-500'
                          }`}
                        >
                          {pattern}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.recurrencePattern === 'weekly' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Days of Week <span className="text-rose-500">*</span>
                      </Label>
                      <div className="grid grid-cols-7 gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                          const isSelected = formData.selectedDaysOfWeek.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                const newSelectedDays = isSelected
                                  ? formData.selectedDaysOfWeek.filter(d => d !== day)
                                  : [...formData.selectedDaysOfWeek, day];
                                setFormData({ ...formData, selectedDaysOfWeek: newSelectedDays });
                              }}
                              className={`
                                px-3 py-2 rounded-lg font-medium text-xs transition-all
                                ${isSelected
                                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25'
                                  : 'bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-purple-300 dark:hover:border-purple-500'
                                }
                              `}
                            >
                              {day.substring(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                      {formData.selectedDaysOfWeek.length > 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Selected: {formData.selectedDaysOfWeek.join(', ')}
                        </p>
                      )}
                      {formData.selectedDaysOfWeek.length === 0 && (
                        <p className="text-xs text-rose-500">
                          Please select at least one day
                        </p>
                      )}
                    </div>
                  )}

                  {formData.recurrencePattern === 'monthly' && (
                    <div className="space-y-2">
                      <Label htmlFor="dayOfMonth" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Day of Month
                      </Label>
                      <Input
                        id="dayOfMonth"
                        type="number"
                        min="1"
                        max="31"
                        value={formData.dayOfMonth}
                        onChange={(e) =>
                          setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })
                        }
                        className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Time & Attendees Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Time & Attendees</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduledTime" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Clock className="inline h-4 w-4 mr-1.5 text-slate-400" />
                      Time <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="scheduledTime"
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                      min="07:00"
                      max="22:00"
                      className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimatedDuration" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Duration (hours)
                    </Label>
                    <Input
                      id="estimatedDuration"
                      type="number"
                      min="1.1"
                      step="0.1"
                      value={formData.estimatedDuration}
                      onChange={(e) => {
                        const duration = parseFloat(e.target.value);
                        if (duration <= 1) {
                          toast.error("Duration must be greater than 1 hour");
                          return;
                        }
                        if (duration > 12) {
                          toast.error("Duration cannot exceed 12 hours");
                          return;
                        }
                        setFormData({ ...formData, estimatedDuration: duration });
                      }}
                      className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expectedAttendees" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Users className="inline h-4 w-4 mr-1.5 text-slate-400" />
                      Expected Attendees
                    </Label>
                    <Input
                      id="expectedAttendees"
                      type="number"
                      min="2"
                      value={formData.expectedAttendees}
                      onChange={(e) => {
                        const attendees = parseInt(e.target.value);
                        if (attendees <= 1) {
                          toast.error("Attendees must be greater than 1");
                          return;
                        }
                        // ✅ Tự động tính Total Budget nếu đã có Budget Per Person
                        const newFormData: any = {
                          ...formData,
                          expectedAttendees: attendees,
                        };
                        if (formData.budgetPerPerson && formData.budgetPerPerson > 0) {
                          newFormData.budgetTotal = Number((formData.budgetPerPerson * attendees).toFixed(2));
                        }
                        setFormData(newFormData);
                      }}
                      className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budgetPerPerson" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      <DollarSign className="inline h-4 w-4 mr-1.5 text-slate-400" />
                      Budget per Person ($)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                      <Input
                        id="budgetPerPerson"
                        type="number"
                        step="5"
                        value={formData.budgetPerPerson}
                        onChange={(e) => {
                          // ✅ Cho phép nhập tự do
                          const budget = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                          // ✅ Tự động tính Total Budget nếu đã có Expected Attendees
                          const newFormData: any = {
                            ...formData,
                            budgetPerPerson: budget,
                          };
                          if (formData.expectedAttendees > 0 && budget > 0) {
                            newFormData.budgetTotal = Number((budget * formData.expectedAttendees).toFixed(2));
                          }
                          setFormData(newFormData);
                        }}
                        onBlur={(e) => {
                          // Validate khi blur
                          const budget = parseInt(e.target.value) || 0;
                          if (budget > 0 && budget < MIN_BUDGET_PER_PERSON) {
                            toast.warning(`Budget per person should be at least $${MIN_BUDGET_PER_PERSON} USD`);
                          }
                        }}
                        className="h-11 pl-8 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule Period Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Schedule Period</h3>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Start Date <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => {
                          const newStartDate = e.target.value;
                          setFormData({ 
                            ...formData, 
                            startDate: newStartDate,
                            // Reset endDate if it's before new start date
                            endDate: formData.endDate && formData.endDate < newStartDate ? '' : formData.endDate
                          });
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        required
                      />
                      {formData.startDate && new Date(formData.startDate) < new Date(new Date().setHours(0, 0, 0, 0)) && (
                        <p className="text-xs text-rose-500">Start date cannot be in the past</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        End Date (Optional)
                      </Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                        className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                      {formData.endDate && formData.startDate && formData.endDate < formData.startDate && (
                        <p className="text-xs text-rose-500">End date must be after or equal to start date</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="occurrenceCount" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Number of Occurrences
                    </Label>
                    <Input
                      id="occurrenceCount"
                      type="number"
                      min="0"
                      value={formData.occurrenceCount}
                      onChange={(e) =>
                        setFormData({ ...formData, occurrenceCount: parseInt(e.target.value) })
                      }
                      className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      placeholder="0 = unlimited"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Set to 0 for unlimited occurrences
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto-create Settings Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Auto-create Settings</h3>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <Checkbox
                      checked={formData.autoCreateEvents}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, autoCreateEvents: checked as boolean })
                      }
                      className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto-create Events</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Automatically create events before they occur
                      </p>
                    </div>
                  </label>

                  {formData.autoCreateEvents && (
                    <div className="space-y-2">
                      <Label htmlFor="daysInAdvance" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Days in Advance
                      </Label>
                      <Input
                        id="daysInAdvance"
                        type="number"
                        min="1"
                        max="30"
                        value={formData.daysInAdvance}
                        onChange={(e) =>
                          setFormData({ ...formData, daysInAdvance: parseInt(e.target.value) })
                        }
                        className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Events will be created this many days before they occur
                      </p>
                    </div>
                  )}

                  {/* Conflict Warnings */}
                  {checkingConflicts && formData.autoCreateEvents && formData.startDate && formData.scheduledTime && (
                    <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Calendar className="h-4 w-4 animate-pulse" />
                      Checking for conflicts with your participating events...
                    </div>
                  )}

                  {conflictWarnings.length > 0 && !checkingConflicts && formData.autoCreateEvents && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Time Conflicts Detected!</strong>
                        <br />
                        <span className="text-xs mt-1 block">
                          {conflictWarnings.length} occurrence(s) will conflict with events you're participating in:
                        </span>
                        <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                          {conflictWarnings.slice(0, 3).map((warning, idx) => (
                            <li key={idx}>
                              {new Date(warning.date).toLocaleDateString()}: {formatConflictingEvents(warning.conflicts)}
                            </li>
                          ))}
                          {conflictWarnings.length > 3 && (
                            <li className="text-slate-500">... and {conflictWarnings.length - 3} more</li>
                          )}
                        </ul>
                        <span className="text-xs mt-2 block text-slate-600">
                          Note: Events will still be created, but you may not be able to attend all of them.
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}

                  {conflictWarnings.length === 0 && !checkingConflicts && formData.autoCreateEvents && formData.startDate && formData.scheduledTime && (
                    <Alert className="mt-4 border-green-200 bg-green-50 dark:bg-green-900/20">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        No conflicts detected with your participating events for the first few occurrences.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
              className="px-6 h-11 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="px-8 h-11 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg shadow-purple-500/25 transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {initialData ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Repeat className="mr-2 h-4 w-4" />
                  {initialData ? 'Update Recurring Event' : 'Create Recurring Event'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRecurringEventModal;
