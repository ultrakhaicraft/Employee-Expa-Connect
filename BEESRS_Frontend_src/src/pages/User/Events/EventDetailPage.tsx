import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  MapPin, 
  CheckCircle, 
  XCircle,
  X,
  Sparkles,
  TrendingUp,
  UserPlus,
  Edit,
  RefreshCw,
  Tag,
  Timer,
  User,
  Mail,
  Share2,
  Copy,
  Activity,
  MessageSquare,
  Star,
  BarChart3,
  UserCog,
  Image as ImageIcon,
  Upload,
  Loader2
} from 'lucide-react';
import eventService from '../../../services/eventService';
import type { EventResponse, VenueOptionResponse, VoteStatisticsResponse, AiAnalysisProgress } from '../../../types/event.types';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Progress } from '../../../components/ui/progress';
import { Separator } from '../../../components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { EVENT_STATE_LABELS, EVENT_STATE_ICONS } from '../../../constants/eventConstants';
import VenueRecommendationCard from '../../../components/Event/VenueRecommendationCard';
import InviteParticipantsModal from '../../../components/Event/InviteParticipantsModal';
import ManageInvitationsModal from '../../../components/Event/ManageInvitationsModal';
import UpdateEventModal from '../../../components/Event/UpdateEventModal';
import ShareEventModal from '../../../components/Events/ShareEventModal';
import CancelEventModal from '../../../components/Event/CancelEventModal';
import AddPlaceOptionModal from '../../../components/Event/AddPlaceOptionModal';
import LocationPickerModal from '../../../components/Event/LocationPickerModal';
import CheckInButton from '../../../components/Event/CheckInButton';
import FeedbackModal from '../../../components/Event/FeedbackModal';
import { useEventPlaceDistances } from '../../../hooks/useEventPlaceDistances';
import { ViewDetailPlace } from '../../../services/userService';
import { convertUtcToLocalTime, formatTimezoneForDisplay, convertUtcToLocalDateTime } from '../../../utils/timezone';

const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Get current user ID - Using the same method as other components in the codebase
  // Primary: Get from Redux decodedToken (most reliable)
  const authState = useSelector((state: any) => state.auth);
  const reduxCurrentUserId = authState?.decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
  
  // Get userId from multiple sources (same pattern as ViewProfile.tsx and PlaceReviewModal.tsx)
  const getCurrentUserId = (): string | null => {
    // 1. Try Redux decodedToken (PRIMARY METHOD - used by other components)
    if (reduxCurrentUserId) {
      return reduxCurrentUserId;
    }
    
    // 2. Try Redux state.user
    const currentUser = authState?.user;
    if (currentUser?.userId) {
      return currentUser.userId;
    }
    if (currentUser?.id) {
      return currentUser.id;
    }
    
    // 3. Try persist:root (Redux Persist) - same as ViewProfile.tsx
    try {
      const persistRoot = localStorage.getItem('persist:root');
      if (persistRoot) {
        const parsedPersist = JSON.parse(persistRoot);
        
        if (parsedPersist.auth) {
          const authData = JSON.parse(parsedPersist.auth);
          
          // Try decodedToken from persist
          if (authData.decodedToken) {
            const userIdFromPersist = authData.decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
            if (userIdFromPersist) {
              return userIdFromPersist;
            }
          }
          
          // Fallback to other fields in persist
          if (authData.user?.userId) {
            return authData.user.userId;
          }
          if (authData.user?.id) {
            return authData.user.id;
          }
        }
      }
    } catch (e) {
      console.error('Error parsing persist:root:', e);
    }
    
    // 4. Try localStorage 'user' key
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser?.userId) {
          return parsedUser.userId;
        }
        if (parsedUser?.id) {
          return parsedUser.id;
        }
      }
    } catch (e) {
      console.error('Error parsing localStorage user:', e);
    }
    
    // 5. Try direct token decode as last resort
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userIdFromToken = payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
                                payload?.sub || 
                                payload?.userId || 
                                payload?.id;
        if (userIdFromToken) {
          return userIdFromToken;
        }
      }
    } catch (e) {
      console.error('Error decoding token:', e);
    }
    
    return null;
  };
  
  const currentUserId = getCurrentUserId();
  
  const [event, setEvent] = useState<EventResponse | null>(null);
  
  // Helper function to check if event date/time has arrived (allow check-in 1 hour before event)
  const canCheckIn = (event: EventResponse | null): boolean => {
    // Always log first to debug
    console.log('canCheckIn called with:', { 
      hasEvent: !!event, 
      scheduledDate: event?.scheduledDate, 
      scheduledTime: event?.scheduledTime,
      eventStatus: event?.status
    });
    
    if (!event || !event.scheduledDate || !event.scheduledTime) {
      console.log('canCheckIn: Missing event date/time', { 
        hasEvent: !!event, 
        scheduledDate: event?.scheduledDate, 
        scheduledTime: event?.scheduledTime 
      });
      return false;
    }
    
    try {
      // Check if event date is today or in the past (simple check first)
      // Extract date only from scheduledDate (handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss" formats)
      let dateOnlyForCheck = event.scheduledDate;
      if (dateOnlyForCheck.includes('T')) {
        dateOnlyForCheck = dateOnlyForCheck.split('T')[0];
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventDateOnly = new Date(dateOnlyForCheck + 'T00:00:00');
      eventDateOnly.setHours(0, 0, 0, 0);
      const isEventDateTodayOrPast = eventDateOnly <= today;
      
      // If event date is in the future, cannot check in
      if (!isEventDateTodayOrPast) {
        console.log('canCheckIn: Event date is in the future', {
          eventDate: eventDateOnly.toISOString(),
          today: today.toISOString()
        });
        return false;
      }
      
      // Normalize time format (handle both "HH:mm" and "HH:mm:ss")
      let timeStr = event.scheduledTime.trim();
      if (timeStr.split(':').length === 2) {
        timeStr = `${timeStr}:00`; // Add seconds if missing
      }
      
      // Extract date only from scheduledDate (handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss" formats)
      let dateOnly = event.scheduledDate;
      if (dateOnly.includes('T')) {
        // If scheduledDate contains time, extract only the date part
        dateOnly = dateOnly.split('T')[0];
      }
      
      // Convert UTC time to local timezone for comparison
      // Backend stores time in UTC, we need to convert to local timezone
      const eventTimezone = event.timezone || 'UTC+00:00';
      const dateTimeString = `${dateOnly} ${timeStr} ${eventTimezone}`;
      const localDateTime = convertUtcToLocalDateTime(dateOnly, timeStr, eventTimezone);
      
      if (!localDateTime) {
        console.error('canCheckIn: Failed to convert UTC to local time', { 
          dateOnly, 
          timeStr, 
          timezone: eventTimezone 
        });
        return false;
      }
      
      let scheduledDateTime = localDateTime;
      
      // Check if date is valid
      if (isNaN(scheduledDateTime.getTime())) {
        console.error('canCheckIn: Invalid date/time', { 
          dateTimeString, 
          scheduledDate: event.scheduledDate, 
          scheduledTime: event.scheduledTime,
          timezone: eventTimezone
        });
        return false;
      }
      
      // Allow check-in 1 hour before event starts
      const checkInStartTime = new Date(scheduledDateTime);
      checkInStartTime.setHours(checkInStartTime.getHours() - 1);
      
      // Event end time (for allowing check-in during event)
      const eventEndTime = new Date(scheduledDateTime);
      if (event.estimatedDuration) {
        eventEndTime.setHours(eventEndTime.getHours() + event.estimatedDuration);
      } else {
        eventEndTime.setHours(eventEndTime.getHours() + 2); // Default 2 hours
      }
      
      // Current time
      const now = new Date();
      
      // Can check in if:
      // 1. Event date is today or in the past, AND
      // 2. Current time is >= 1 hour before event starts (12:00) AND event hasn't ended yet
      const withinTimeWindow = now >= checkInStartTime && now <= eventEndTime;
      
      // More lenient logic:
      // - If event date is today and current time >= check-in start time (12:00), allow check-in
      // - Or if event has already started (now >= scheduledDateTime), allow check-in
      // - Or if we're within the time window
      const isEventToday = eventDateOnly.getTime() === today.getTime();
      const canCheckInNow = isEventDateTodayOrPast && (
        withinTimeWindow || 
        (isEventToday && now >= checkInStartTime) || 
        now >= scheduledDateTime
      );
      
      // Debug logging - ALWAYS log to help debug
      console.log('canCheckIn check:', {
        scheduledDate: event.scheduledDate,
        scheduledTime: event.scheduledTime,
        eventTimezone: eventTimezone,
        dateOnly,
        timeStr,
        dateTimeString,
        scheduledDateTime: scheduledDateTime.toISOString(),
        scheduledDateTimeLocal: scheduledDateTime.toString(),
        scheduledDateTimeHours: scheduledDateTime.getHours() + ':' + String(scheduledDateTime.getMinutes()).padStart(2, '0'),
        checkInStartTime: checkInStartTime.toISOString(),
        checkInStartTimeLocal: checkInStartTime.toString(),
        checkInStartTimeHours: checkInStartTime.getHours() + ':' + String(checkInStartTime.getMinutes()).padStart(2, '0'),
        eventEndTime: eventEndTime.toISOString(),
        eventEndTimeLocal: eventEndTime.toString(),
        now: now.toISOString(),
        nowLocal: now.toString(),
        nowHours: now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0'),
        isEventDateTodayOrPast,
        isEventToday: eventDateOnly.getTime() === today.getTime(),
        withinTimeWindow,
        canCheckIn: canCheckInNow,
        timeUntilCheckIn: Math.round((checkInStartTime.getTime() - now.getTime()) / 1000 / 60), // minutes
        timeSinceEventStart: Math.round((now.getTime() - scheduledDateTime.getTime()) / 1000 / 60), // minutes
        timeUntilEventEnd: Math.round((eventEndTime.getTime() - now.getTime()) / 1000 / 60), // minutes
      });
      
      return canCheckInNow;
    } catch (error) {
      console.error('Error parsing event date/time:', error, { 
        scheduledDate: event.scheduledDate, 
        scheduledTime: event.scheduledTime 
      });
      return false;
    }
  };
  const [recommendations, setRecommendations] = useState<VenueOptionResponse[]>([]);
  const [voteStats, setVoteStats] = useState<VoteStatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showManageInvitationsModal, setShowManageInvitationsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  const [showLocationPickerModal, setShowLocationPickerModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [aiAnalysisStartTime, setAiAnalysisStartTime] = useState<Date | null>(null);
  const [aiProgressStep, setAiProgressStep] = useState<number>(1);
  const [aiProgressDetails, setAiProgressDetails] = useState<AiAnalysisProgress | null>(null);
  const [eventImagePreview, setEventImagePreview] = useState<string | null>(null);
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [venueLocation, setVenueLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // TrackAsia Distance Calculation - User location and transport mode
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [transportMode, setTransportMode] = useState<'car' | 'moto' | 'walk'>('car');
  const [sortByDistance, setSortByDistance] = useState(false);

  // Get user's current location for distance calculation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Location error:', error);
          // Silently fail - distance will just not be shown
        }
      );
    }
  }, []);

  // Calculate distances for place recommendations
  const { places: recommendationsWithDistance, loading: calculatingDistances } = useEventPlaceDistances(
    userLocation,
    recommendations,
    {
      enabled: !!userLocation && recommendations.length > 0,
      profile: transportMode,
      sortByDistance: sortByDistance
    }
  );

  // Sort recommendations: prioritize system places, then by AI score, then by rating/reviews
  const sortedRecommendations = React.useMemo(() => {
    const recs = userLocation && !calculatingDistances 
      ? recommendationsWithDistance 
      : recommendations;
    
    return [...recs].sort((a, b) => {
      // Priority 1: System places (with placeId) come first
      const aIsSystem = !!a.placeId;
      const bIsSystem = !!b.placeId;
      
      if (aIsSystem && !bIsSystem) return -1; // a comes first
      if (!aIsSystem && bIsSystem) return 1;  // b comes first
      
      // Priority 2: Within same type, sort by AI score (if available)
      const aHasAiScore = a.aiScore != null;
      const bHasAiScore = b.aiScore != null;
      
      if (aHasAiScore && !bHasAiScore) return -1; // AI scored options first
      if (!aHasAiScore && bHasAiScore) return 1;
      
      // Priority 3: Higher AI score first
      if (aHasAiScore && bHasAiScore && a.aiScore !== b.aiScore) {
        return (b.aiScore || 0) - (a.aiScore || 0); // Descending: higher score first
      }
      
      // Priority 4: Sort by rating (higher is better)
      const aRating = aIsSystem ? (a.averageRating || 0) : (a.externalRating || 0);
      const bRating = bIsSystem ? (b.averageRating || 0) : (b.externalRating || 0);
      
      if (aRating !== bRating) {
        return bRating - aRating; // Descending: higher rating first
      }
      
      // Priority 5: Sort by number of reviews (more is better)
      const aReviews = aIsSystem ? (a.totalReviews || 0) : (a.externalTotalReviews || 0);
      const bReviews = bIsSystem ? (b.totalReviews || 0) : (b.externalTotalReviews || 0);
      
      if (aReviews !== bReviews) {
        return bReviews - aReviews; // Descending: more reviews first
      }
      
      // If all are equal, maintain original order (stable sort)
      return 0;
    });
  }, [userLocation, calculatingDistances, recommendationsWithDistance, recommendations]);

  // Use sorted recommendations
  const displayRecommendations = sortedRecommendations;

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  // Auto-refresh voting statistics every 10 seconds when voting
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh && event?.status === 'voting' && id) {
      interval = setInterval(() => {
        fetchVoteStatistics();
      }, 10000); // 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, event?.status, id]);

  // Auto-refresh recommendations and drive AI progress when recommendations are being generated
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let progressInterval: NodeJS.Timeout | null = null;
    let timeout: NodeJS.Timeout | null = null;
    
    // Show AI-style progressive steps both:
    // - while organizer has just clicked "Generate AI recommendations" (generatingRecommendations = true)
    // - and while backend is in ai_recommending state but recommendations are not ready yet
    if ((event?.status === 'ai_recommending' || generatingRecommendations) && id && recommendations.length === 0 && event) {
      // Use backend time if available, otherwise use current time
      const startTime = event.aiAnalysisStartedAt 
        ? new Date(event.aiAnalysisStartedAt) 
        : new Date();
      
      if (!aiAnalysisStartTime || 
          (event.aiAnalysisStartedAt && !aiAnalysisStartTime.getTime())) {
        setAiAnalysisStartTime(startTime);
      }

      // Update progress step based on elapsed time from backend
      progressInterval = setInterval(() => {
        const currentStartTime = event.aiAnalysisStartedAt 
          ? new Date(event.aiAnalysisStartedAt) 
          : aiAnalysisStartTime;
        
        if (currentStartTime) {
          const elapsed = (Date.now() - currentStartTime.getTime()) / 1000; // seconds
          
          if (elapsed < 8) {
            setAiProgressStep(1); // Analyzing preferences
          } else if (elapsed < 18) {
            setAiProgressStep(2); // Searching venues
          } else if (elapsed < 30) {
            setAiProgressStep(3); // Evaluating venues
          } else if (elapsed < 45) {
            setAiProgressStep(4); // Generating recommendations
          } else {
            setAiProgressStep(5); // Finalizing
          }
        }
      }, 2000); // Update every 2 seconds

      // Poll for recommendations every 10 seconds (increased from 5s to reduce load)
      // Only fetch recommendations endpoint, not full event details
      const pollRecommendations = async () => {
        if (id && recommendations.length === 0) {
          try {
            const recs = await eventService.getRecommendations(id);
            if (recs && recs.length > 0) {
              setRecommendations(recs);
              setAiAnalysisStartTime(null);
              // Refresh event status once to update to voting
              await fetchEventDetails();
            } else {
              // If we get empty array, also refresh event status to check if it changed
              await fetchEventDetails();
            }
          } catch (error: any) {
            // Log error for debugging but don't show to user
            console.debug('Polling recommendations:', error.response?.status, error.message);
            // If it's a 403 or 400, refresh event status to check current state
            if (error.response?.status === 403 || error.response?.status === 400) {
              await fetchEventDetails();
            }
          }
        }
      };
      
      // Start polling after initial delay
      interval = setInterval(pollRecommendations, 10000); // 10 seconds
      
      // Stop polling after 3 minutes to prevent infinite polling
      timeout = setTimeout(() => {
        if (interval) clearInterval(interval);
        if (progressInterval) clearInterval(progressInterval);
      }, 180000); // 3 minutes max
    }

    return () => {
      if (interval) clearInterval(interval);
      if (progressInterval) clearInterval(progressInterval);
      if (timeout) clearTimeout(timeout);
    };
  }, [event?.status, event?.aiAnalysisStartedAt, id, recommendations.length, aiAnalysisStartTime, generatingRecommendations]);

  const fetchEventDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const eventData = await eventService.getEvent(id);
      setEvent(eventData);
      
      // Parse AI analysis progress if available
      if (eventData.aiAnalysisProgress) {
        try {
          const progress = JSON.parse(eventData.aiAnalysisProgress) as AiAnalysisProgress;
          setAiProgressDetails(progress);
          // Use step from progress if available
          if (progress.currentStep) {
            setAiProgressStep(progress.currentStep);
          }
        } catch (error) {
          console.error('Failed to parse AI analysis progress:', error);
        }
      } else {
        setAiProgressDetails(null);
      }
      
      // Load existing event image if available
      const existingImageUrl = eventData.eventImageUrl && eventData.eventImageUrl.trim() !== '' 
        ? eventData.eventImageUrl 
        : null;
      setEventImagePreview(existingImageUrl);
      setEventImageFile(null);

      // Update AI analysis start time from backend if available
      if (eventData.status === 'ai_recommending' && eventData.aiAnalysisStartedAt) {
        const backendStartTime = new Date(eventData.aiAnalysisStartedAt);
        // Only update if we don't have a start time or if backend time is different
        if (!aiAnalysisStartTime || Math.abs(backendStartTime.getTime() - aiAnalysisStartTime.getTime()) > 1000) {
          setAiAnalysisStartTime(backendStartTime);
        }
      }

      // Fetch recommendations if event is in AI recommending, voting, or later stages
      // Only fetch if we don't already have recommendations to avoid unnecessary calls
      if (['ai_recommending', 'voting', 'confirmed', 'completed'].includes(eventData.status)) {
        // Only fetch if we don't have recommendations yet
        if (recommendations.length === 0) {
          await fetchRecommendations();
        }
      }
      
      // Also fetch recommendations if event has final place (might have recommendations history)
      // Only if we don't already have them
      if (eventData.finalPlaceId) {
        if (recommendations.length === 0) {
          await fetchRecommendations();
        }
      }

      // Fetch vote statistics if voting
      if (eventData.status === 'voting') {
        await fetchVoteStatistics();
      }

      // Fetch venue location if event has final place
      if (eventData.finalPlaceId) {
        await fetchVenueLocation(eventData.finalPlaceId);
      }

      // Check check-in status for current user (from voting status onwards)
      if (currentUserId && ['voting', 'confirmed', 'completed'].includes(eventData.status)) {
        await checkCheckInStatus();
      }

      // Check feedback status for current user
      if (currentUserId && eventData.status === 'completed') {
        await checkFeedbackStatus();
      }
    } catch (error: any) {
      toast.error('Failed to fetch event details: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchVenueLocation = async (placeId: string) => {
    try {
      const placeDetail = await ViewDetailPlace({ placeId });
      if (placeDetail && placeDetail.latitude && placeDetail.longitude) {
        setVenueLocation({
          latitude: typeof placeDetail.latitude === 'number' 
            ? placeDetail.latitude 
            : Number(placeDetail.latitude),
          longitude: typeof placeDetail.longitude === 'number' 
            ? placeDetail.longitude 
            : Number(placeDetail.longitude),
        });
      }
    } catch (error) {
      console.error('Failed to fetch venue location:', error);
      // Silently fail - location-based check-in will be disabled
    }
  };

  const checkCheckInStatus = async () => {
    if (!id || !currentUserId) {
      console.log('checkCheckInStatus: Missing id or currentUserId', { id, currentUserId });
      return;
    }
    
    try {
      const checkIn = await eventService.getCheckInStatus(id);
      const checkedIn = !!checkIn;
      console.log('checkCheckInStatus: Check-in status', { checkIn, checkedIn });
      setIsCheckedIn(checkedIn);
    } catch (error: any) {
      // If check-in not found (404), user hasn't checked in yet - this is normal
      if (error.response?.status === 404) {
        console.log('checkCheckInStatus: Check-in not found (404) - user has not checked in yet');
        setIsCheckedIn(false);
      } else {
        console.error('checkCheckInStatus: Error checking check-in status', error);
        setIsCheckedIn(false);
      }
    }
  };

  const checkFeedbackStatus = async () => {
    if (!id || !currentUserId) return;
    
    try {
      const feedback = await eventService.getEventFeedback(id);
      if (feedback) {
        setExistingFeedback(feedback);
      } else {
        setExistingFeedback(null);
      }
    } catch (error: any) {
      // If feedback not found (404), set to null
      if (error.response?.status === 404) {
        setExistingFeedback(null);
      } else {
        console.error('Failed to check feedback status:', error);
        // Don't set to null on other errors, keep existing state
      }
    }
  };

  const fetchRecommendations = async () => {
    if (!id) return;

    try {
      const recs = await eventService.getRecommendations(id);
      setRecommendations(recs);
    } catch (error: any) {
      console.error('Failed to fetch recommendations:', error);
      toast.error('Failed to load venue recommendations: ' + (error.response?.data?.message || error.message));
    }
  };

  const fetchVoteStatistics = async () => {
    if (!id) return;

    try {
      const stats = await eventService.getVotes(id);
      setVoteStats(stats);
    } catch (error: any) {
      console.error('Failed to fetch vote statistics:', error);
    }
  };

  const handleGenerateRecommendations = async (location?: { lat: number; lng: number }, radius?: number) => {
    if (!id) return;

    try {
      setGeneratingRecommendations(true);
      setAiAnalysisStartTime(new Date());
      setAiProgressStep(1);
      toast.info('🤖 Analyzing preferences and generating AI recommendations...');
      
      await eventService.generateRecommendations(id, location, radius);
      
      toast.success('✨ Recommendations generated successfully!');
      
      // Refresh event data and fetch recommendations
      await fetchEventDetails();
      await fetchRecommendations();
      setAiAnalysisStartTime(null);
    } catch (error: any) {
      toast.error('Failed to generate recommendations: ' + (error.response?.data?.message || error.message));
      setAiAnalysisStartTime(null);
    } finally {
      setGeneratingRecommendations(false);
    }
  };

  const handleOpenLocationPicker = () => {
    setShowLocationPickerModal(true);
  };

  const handleLocationConfirm = (location: { lat: number; lng: number }, radius: number) => {
    setShowLocationPickerModal(false);
    // TODO: Pass location and radius to backend
    handleGenerateRecommendations(location, radius);
  };

  const handleAcceptInvitation = async () => {
    if (!id) return;

    if (isDeadlinePassed) {
      toast.error('The invitation deadline for this event has passed');
      return;
    }

    try {
      await eventService.acceptInvitation(id);
      toast.success('Invitation accepted!');
      await fetchEventDetails();
    } catch (error: any) {
      toast.error('Failed to accept invitation: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeclineInvitation = async () => {
    if (!id) return;

    if (isDeadlinePassed) {
      toast.error('The invitation deadline for this event has passed');
      return;
    }

    try {
      await eventService.declineInvitation(id);
      toast.info('Invitation declined');
      navigate('/user/events');
    } catch (error: any) {
      toast.error('Failed to decline invitation: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleVote = async (optionId: string, voteValue: number, comment?: string) => {
    if (!id) return;

    try {
      await eventService.castVote(id, { optionId, voteValue, comment });
      toast.success('Vote cast successfully!');
      await fetchVoteStatistics();
    } catch (error: any) {
      toast.error('Failed to cast vote: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleFinalizeEvent = async (optionId: string) => {
    if (!id) return;

    try {
      await eventService.finalizeEvent(id, optionId);
      toast.success('Event finalized! Venue confirmed.');
      await fetchEventDetails();
    } catch (error: any) {
      toast.error('Failed to finalize event: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAddToSystem = async (optionId: string) => {
    if (!id) return;

    try {
      toast.loading('Adding place to system...', { 
        id: 'add-to-system',
        description: 'Please wait while we save this place to your system.'
      });
      await eventService.convertExternalPlaceToInternal(id, optionId);
      toast.success('✅ Place Added Successfully!', { 
        id: 'add-to-system',
        description: 'This place has been saved to your system and is now available for future events.',
        duration: 5000
      });
      
      // Refresh recommendations to show updated data
      await fetchRecommendations();
    } catch (error: any) {
      toast.error('❌ Failed to Add Place', { 
        id: 'add-to-system',
        description: error.response?.data?.message || error.message || 'Please try again later.',
        duration: 5000
      });
    }
  };

  const handleCancelEvent = () => {
    if (!id || !event) return;

    // Check if event is already cancelled or completed
    if (event.status?.toLowerCase() === 'cancelled') {
      toast.error('Event is already cancelled');
      return;
    }

    if (event.status?.toLowerCase() === 'completed') {
      toast.error('Cannot cancel a completed event');
      return;
    }

    // Open the cancel modal
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!id) return;

    try {
      await eventService.cancelEvent(id, reason);
      toast.success('Event cancelled successfully');
      await fetchEventDetails(); // Refresh to update status
      // Navigate after a short delay to show the success message
      setTimeout(() => {
        navigate('/user/events');
      }, 1500);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      toast.error('Failed to cancel event: ' + errorMessage);
      throw error; // Re-throw to let modal handle it
    }
  };

  const handleInviteParticipants = async (userIds: string[]) => {
    if (!id) return;
    
    await eventService.inviteParticipants(id, userIds);
    await fetchEventDetails(); // Refresh to show new participants
  };

  const handleUpdateEvent = async (data: any) => {
    if (!id) return;
    
    await eventService.updateEvent(id, data);
    await fetchEventDetails(); // Refresh event data
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span>Loading event details...</span>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-red-500">Event not found</p>
      </div>
    );
  }

  // Check user roles based on current user ID from Redux
  const isOrganizer = currentUserId && event.organizerId === currentUserId;
  const isParticipant = event.participants.some(p => p.userId === currentUserId);
  const myParticipation = event.participants.find(p => p.userId === currentUserId);
  const alreadyInvitedIds = event.participants.map(p => p.userId);

  const invitationParticipants = event.participants.map(p => {
    // Robustly get profile picture URL
    const participant = p as any;
    let avatarUrl = participant.profilePictureUrl || 
                     participant.ProfilePictureUrl || 
                     participant.profilePicture ||
                     participant.ProfilePicture ||
                     participant.profile?.profilePictureUrl || 
                     participant.userProfile?.profilePictureUrl || 
                     participant.avatarUrl || 
                     participant.avatar ||
                     participant.profileImage ||
                     participant.AvatarUrl ||
                     participant.profile?.profileImage ||
                     participant.profile?.profilePicture ||
                     undefined;
    
    // Fallback for current user from Redux store if API doesn't provide it
    if (!avatarUrl && p.userId === currentUserId && authState?.user?.profilePictureUrl) {
      avatarUrl = authState.user.profilePictureUrl;
    }
                     
    return {
      userId: p.userId,
      fullName: p.fullName || p.email || 'Unknown',
      email: p.email || '',
      profilePictureUrl: avatarUrl,
      invitationStatus: p.invitationStatus,
      rsvpDate: p.rsvpDate,
      invitedAt: undefined,
    };
  });

  // Helper function to safely format dates
  const safeFormatDate = (dateString: string | undefined | null, formatStr: string, fallback: string = 'N/A'): string => {
    if (!dateString) return fallback;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return fallback;
      return format(date, formatStr);
    } catch {
      return fallback;
    }
  };

  // Check if event is editable (not cancelled or completed)
  const isEditable = event.status?.toLowerCase() !== 'cancelled' && event.status?.toLowerCase() !== 'completed';
  const isDeadlinePassed = event.rsvpDeadline ? new Date() > new Date(event.rsvpDeadline) : false;
  const canSendInvitations = isEditable && !isDeadlinePassed && ['draft', 'planning', 'inviting', 'gathering_preferences'].includes(event.status?.toLowerCase() || '');

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

  const handleUploadEventImage = async () => {
    if (!id || !eventImageFile) return;

    try {
      const imageUrl = await eventService.uploadEventImage(id, eventImageFile);
      setEventImagePreview(imageUrl);
      setEventImageFile(null);
      setEvent({ ...event, eventImageUrl: imageUrl });
      toast.success("Event image uploaded successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    }
  };

  const handleGenerateEventImage = async () => {
    if (!event) return;

    if (!event.title) {
      toast.error("Event title is required to generate an image");
      return;
    }

    setGeneratingImage(true);
    try {
      const imageUrl = await eventService.generateEventCoverImage({
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        location: event.finalPlaceName,
        country: ""
      });

      setEventImagePreview(imageUrl);
      setEventImageFile(null);
      setEvent({ ...event, eventImageUrl: imageUrl });
      
      toast.success("✨ AI-generated event image created!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate image");
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Hero Section with Gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-2xl">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Badge 
                  variant={event.status === 'cancelled' ? 'destructive' : 'secondary'}
                  className="text-sm px-4 py-1 bg-white/20 backdrop-blur-sm border-white/30"
                >
                  {EVENT_STATE_ICONS[event.status]} {EVENT_STATE_LABELS[event.status]}
                </Badge>
                {isOrganizer && (
                  <Badge className="bg-yellow-500/90 text-yellow-900 border-yellow-300">
                    <Star className="mr-1 h-3 w-3" />
                    Organizer
                  </Badge>
                )}
                {isParticipant && (
                  <Badge className="bg-green-500/90 text-green-900 border-green-300">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Participant
                  </Badge>
                )}
                {isOrganizer && (event.status === 'confirmed' || event.status === 'completed') && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                    onClick={() => navigate(`/user/events/${id}/analytics`)}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Analytics
                  </Button>
                )}
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold mb-3 drop-shadow-lg">
                {event.title}
              </h1>
              
              {event.description && (
                <p className="text-lg text-white/90 mb-4 max-w-3xl">
                  {event.description}
                </p>
              )}

              {/* Event Avatar Section */}
              {isOrganizer && isEditable && (
                <div className="mb-6 p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {eventImagePreview ? (
                        <div className="relative w-28 h-20 rounded-lg overflow-hidden border border-white/30 shadow-md group">
                          <img
                            src={eventImagePreview}
                            alt="Event preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-0.5 right-0.5 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            onClick={handleRemoveEventImage}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="w-28 h-20 border border-dashed border-white/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-white/50 hover:bg-white/5 transition-all"
                        >
                          <ImageIcon className="h-6 w-6 text-white/70" />
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
                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                      <div className="text-xs text-white/90 font-medium">Event Cover Image</div>
                      {!eventImagePreview && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1 bg-white/10 border border-white/30 text-white rounded-md hover:bg-white/20 hover:border-white/40 transition-all text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Upload
                          </button>
                          <button
                            type="button"
                            onClick={handleGenerateEventImage}
                            disabled={generatingImage || !event.title}
                            className="px-2.5 py-1 bg-purple-500/20 border border-purple-300/50 text-white rounded-md hover:bg-purple-500/30 hover:border-purple-300/70 transition-all text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                      {eventImagePreview && eventImageFile && (
                        <button
                          type="button"
                          onClick={handleUploadEventImage}
                          className="w-fit px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-all text-xs font-medium flex items-center gap-1.5"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Upload
                        </button>
                      )}
                      {eventImagePreview && !eventImageFile && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-fit px-2.5 py-1 bg-white/10 border border-white/30 text-white rounded-md hover:bg-white/20 hover:border-white/40 transition-all text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Change
                        </button>
                      )}
                      <p className="text-xs text-white/70 leading-relaxed">
                        Optional: Upload or generate cover image
                      </p>
                    </div>
                  </div>
                </div>
              )}


              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6 mt-6">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <Calendar className="h-5 w-5" />
                  <div>
                    <p className="text-xs text-white/70">Date</p>
                    <p className="font-semibold">{safeFormatDate(event.scheduledDate, 'MMM dd, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <Clock className="h-5 w-5" />
                  <div>
                    <p className="text-xs text-white/70">Time</p>
                    <p className="font-semibold">
                      {convertUtcToLocalTime(event.scheduledTime, event.timezone)} ({formatTimezoneForDisplay(event.timezone)})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <Users className="h-5 w-5" />
                  <div>
                    <p className="text-xs text-white/70">Participants</p>
                    <p className="font-semibold">{event.acceptedCount}/{event.expectedAttendees}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <DollarSign className="h-5 w-5" />
                  <div>
                    <p className="text-xs text-white/70">Budget</p>
                    <p className="font-semibold">${event.budgetPerPerson || 0}/person</p>
                  </div>
                </div>
                {event.rsvpDeadline && (
                  <div className={`flex items-center gap-2 backdrop-blur-sm px-4 py-2 rounded-lg ${isDeadlinePassed ? 'bg-red-500/30 text-red-100 border border-red-400/50' : 'bg-white/10'}`}>
                    <Clock className="h-5 w-5" />
                    <div>
                      <p className="text-xs text-white/70">Invite Deadline</p>
                      <p className={`font-semibold ${isDeadlinePassed ? 'text-red-200' : ''}`}>
                        {safeFormatDate(event.rsvpDeadline, 'MMM dd, p')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons - Prominent Position */}
            {isOrganizer && isEditable && (
              <div className="flex flex-col gap-3 lg:items-end">
                <div className="flex gap-2">
                  <Button
                    size="lg"
                    onClick={() => {
                      if (isDeadlinePassed) {
                        toast.error('Invitation deadline has passed');
                        return;
                      }
                      if (!canSendInvitations) {
                        toast.error(`Cannot invite more participants in current status: ${event.status}`);
                        return;
                      }
                      setShowInviteModal(true);
                    }}
                    className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105 font-semibold px-8 py-6 text-lg"
                    disabled={!canSendInvitations}
                  >
                    <UserPlus className="mr-2 h-6 w-6" />
                    Invite Participants
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => setShowShareModal(true)}
                    className="bg-green-600 text-white hover:bg-green-700 shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105 font-semibold px-8 py-6 text-lg"
                  >
                    <Share2 className="mr-2 h-6 w-6" />
                    Share Event
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowUpdateModal(true)}
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Event
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleCancelEvent}
                    className="bg-red-500/20 border-red-300/30 text-white hover:bg-red-500/30 backdrop-blur-sm"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/user/events/${id}/waitlist`)}
                    className="bg-purple-500/20 border-purple-300/30 text-white hover:bg-purple-500/30 backdrop-blur-sm"
                  >
                    <UserCog className="mr-2 h-4 w-4" />
                    Manage Waitlist
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Link copied to clipboard!');
                    }}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Event
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Cover Image Card */}
          {event.eventImageUrl && event.eventImageUrl.trim() !== '' && (
            <Card className="shadow-lg overflow-hidden">
              <div className="relative w-full aspect-video bg-gradient-to-br from-blue-500 to-purple-600">
                <img
                  src={event.eventImageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            </Card>
          )}

          {/* Detailed Event Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stat Card 1 */}
            <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Participants</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{event.participants.length}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {event.acceptedCount} accepted • {event.participants.filter(p => p.invitationStatus === 'pending').length} pending
                    </p>
                  </div>
                  <Users className="h-12 w-12 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            {/* Stat Card 2 */}
            <Card className="border-l-4 border-l-green-500 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Budget</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">${event.budgetTotal}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      ${event.budgetPerPerson} per person
                    </p>
                  </div>
                  <DollarSign className="h-12 w-12 text-green-200" />
                </div>
              </CardContent>
            </Card>

            {/* Stat Card 3 */}
            <Card className="border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Duration</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{event.estimatedDuration || 2}h</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Estimated time
                    </p>
                  </div>
                  <Timer className="h-12 w-12 text-purple-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comprehensive Event Details */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
              <CardTitle className="flex items-center text-xl">
                <Activity className="mr-2 h-6 w-6 text-blue-600" />
                Event Information
              </CardTitle>
              <CardDescription>Complete details about this event</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Event Type */}
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Tag className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 font-medium">Event Type</p>
                    <p className="font-semibold text-gray-900">{event.eventType}</p>
                  </div>
                </div>

                {/* Scheduled Date */}
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 font-medium">Event Date</p>
                    <p className="font-semibold text-gray-900">{safeFormatDate(event.scheduledDate, 'PPPP')}</p>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 font-medium">Time</p>
                    <p className="font-semibold text-gray-900">
                      {convertUtcToLocalTime(event.scheduledTime, event.timezone)} ({formatTimezoneForDisplay(event.timezone)})
                    </p>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Timer className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 font-medium">Duration</p>
                    <p className="font-semibold text-gray-900">{event.estimatedDuration || 2} hours</p>
                  </div>
                </div>

                {/* Expected Attendees */}
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="p-2 bg-pink-100 rounded-lg">
                    <Users className="h-5 w-5 text-pink-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 font-medium">Expected Attendees</p>
                    <p className="font-semibold text-gray-900">{event.expectedAttendees} people</p>
                    <div className="mt-2">
                      <Progress 
                        value={(event.acceptedCount / event.expectedAttendees) * 100} 
                        className="h-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {event.acceptedCount} accepted ({((event.acceptedCount / event.expectedAttendees) * 100).toFixed(0)}%)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Budget Info */}
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 font-medium">Budget Details</p>
                    <p className="font-semibold text-gray-900">${event.budgetTotal?.toLocaleString()} USD total</p>
                    <p className="text-sm text-gray-600">${event.budgetPerPerson?.toLocaleString()} per person</p>
                  </div>
                </div>
              </div>

              {event.finalPlaceName && (
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-green-100 rounded-full">
                      <MapPin className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-green-600 font-semibold uppercase tracking-wide">Confirmed Venue</p>
                      <p className="text-xl font-bold text-green-900 mt-1">{event.finalPlaceName}</p>
                      <Badge className="mt-2 bg-green-600">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Venue Confirmed
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Organizer Info */}
              <Separator className="my-6" />
              <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                <div className="p-3 bg-blue-100 rounded-full">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-600 font-medium">Event Organizer</p>
                  <p className="font-semibold text-gray-900">{event.organizerName || 'Event Organizer'}</p>
                  <p className="text-sm text-gray-600 flex items-center mt-1">
                    <Mail className="h-4 w-4 mr-1" />
                    {event.organizerEmail || 'Contact via system'}
                  </p>
                </div>
                {isOrganizer && (
                  <Badge className="bg-yellow-500 text-yellow-900">
                    <Star className="mr-1 h-3 w-3" />
                    You
                  </Badge>
                )}
              </div>

              {/* Timestamps */}
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 text-xs">Created At</p>
                  <p className="font-medium text-gray-900">{safeFormatDate(event.createdAt, 'PPp')}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 text-xs">Last Updated</p>
                  <p className="font-medium text-gray-900">{safeFormatDate(event.updatedAt, 'PPp')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invitation Actions */}
          {isParticipant && myParticipation?.invitationStatus === 'pending' && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900">You're Invited!</CardTitle>
                <CardDescription>Would you like to join this event?</CardDescription>
              </CardHeader>
              <CardFooter className="space-x-2">
                <Button onClick={handleAcceptInvitation}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accept
                </Button>
                <Button variant="outline" onClick={handleDeclineInvitation}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Decline
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Start Gathering Preferences Button - When enough members accepted in inviting status */}
          {isOrganizer && 
           event.status === 'inviting' && 
           event.acceptedCount >= Math.ceil(event.expectedAttendees * (event.acceptanceThreshold || 0.7)) && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-900 flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Enough participants! Start collecting preferences
                </CardTitle>
                <CardDescription>
                  {event.acceptedCount}/{event.expectedAttendees} participants have accepted. You can now collect preferences and generate AI venue recommendations.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button 
                  onClick={handleOpenLocationPicker}
                  disabled={generatingRecommendations}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {generatingRecommendations ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Select Location & Generate AI Recommendations
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Generate Recommendations Button - When in gathering_preferences status */}
          {isOrganizer && 
           event.status === 'gathering_preferences' && 
           event.acceptedCount >= Math.ceil(event.expectedAttendees * (event.acceptanceThreshold || 0.7)) &&
           !event.finalPlaceName && (  // Don't show if venue is already confirmed
            <Card className={`border-purple-200 bg-purple-50 relative overflow-hidden ${
              generatingRecommendations ? 'shadow-[0_0_0_1px_rgba(147,51,234,0.4)]' : ''
            }`}>
              {/* Subtle animated AI glow when generating */}
              {generatingRecommendations && (
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-purple-500/10 via-sky-500/10 to-fuchsia-500/10 blur-sm animate-pulse" />
              )}

              <CardHeader className="relative z-10">
                <CardTitle className="text-purple-900 flex items-center">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Ready to generate AI recommendations
                </CardTitle>
                <CardDescription>
                  Enough preferences have been collected. Generate smart venue recommendations with AI.
                </CardDescription>
              </CardHeader>
              
              {/* Inline AI progress tracking while request is running */}
              {generatingRecommendations && (
                <CardContent className="relative z-10 pt-0">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/80 border border-purple-100 shadow-sm">
                      <div className="mt-0.5">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
                          <span className="text-[10px] font-semibold text-white">AI</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">
                          AI is preparing your venue recommendations
                        </p>
                        <p className="text-xs text-gray-600">
                          Understanding team preferences, scanning locations and scoring the best options for your event.
                        </p>
                      </div>
                    </div>

                    {/* Mini steps */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 border border-purple-100">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-purple-500 border-b-transparent animate-spin" />
                        <div>
                          <p className="font-medium text-gray-800">Reading preferences</p>
                          <p className="text-[11px] text-gray-500">Analyzing what your team likes and budget limits.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/70 border border-purple-100/70">
                        <div className="w-3.5 h-3.5 rounded-full border border-purple-300" />
                        <div>
                          <p className="font-medium text-gray-800">Scanning venues</p>
                          <p className="text-[11px] text-gray-500">Filtering places that fit time, size and location.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 border border-purple-100/40">
                        <div className="w-3.5 h-3.5 rounded-full border border-purple-200" />
                        <div>
                          <p className="font-medium text-gray-800">Scoring options</p>
                          <p className="text-[11px] text-gray-500">Ranking venues to surface the smartest shortlist.</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-1">
                      <div className="flex justify-between text-[11px] text-gray-600 mb-1">
                        <span>AI progress</span>
                        <span>~{Math.min(aiProgressStep * 20, 95)}%</span>
                      </div>
                      <Progress 
                        value={Math.min(aiProgressStep * 20, 95)} 
                        className="h-1.5 bg-purple-100"
                      />
                    </div>
                  </div>
                </CardContent>
              )}

              <CardFooter className="relative z-10">
                <Button 
                  onClick={handleOpenLocationPicker}
                  disabled={generatingRecommendations}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {generatingRecommendations ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      <span>AI is working...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate AI recommendations
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Final Place - Show prominently if confirmed */}
          {event.finalPlaceName && (
            <Card className="border-2 border-green-500 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center text-green-900">
                  <MapPin className="mr-2 h-6 w-6 text-green-600" />
                  Venue confirmed
                </CardTitle>
                <CardDescription className="text-green-700">
                  Final venue for this event
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-green-200">
                  <div className="p-3 bg-green-100 rounded-full">
                    <MapPin className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-green-900">{event.finalPlaceName}</p>
                    <Badge className="mt-2 bg-green-600 text-white">
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Confirmed
                    </Badge>
                  </div>
                </div>
                
                {/* Check-in Button - Show for accepted participants when event date/time has arrived (1 hour before event) */}
                {(() => {
                  const shouldShowCheckIn = isParticipant && 
                    myParticipation?.invitationStatus === 'accepted' && 
                    event.status !== 'cancelled' && 
                    event.status !== 'draft' &&
                    canCheckIn(event) && 
                    id &&
                    !isCheckedIn; // Only show if not already checked in
                  
                  // Debug logging
                  if (isParticipant && myParticipation?.invitationStatus === 'accepted') {
                    console.log('Check-in button visibility check:', {
                      isParticipant,
                      invitationStatus: myParticipation?.invitationStatus,
                      eventStatus: event.status,
                      canCheckIn: canCheckIn(event),
                      hasId: !!id,
                      isCheckedIn,
                      shouldShowCheckIn
                    });
                  }
                  
                  return shouldShowCheckIn ? (
                    <div className="mt-4">
                      <CheckInButton
                        eventId={id}
                        isCheckedIn={isCheckedIn}
                        venueLocation={venueLocation || undefined}
                        checkInRadiusMeters={200}
                        onCheckedIn={() => {
                          setIsCheckedIn(true);
                          fetchEventDetails(); // Refresh event data
                        }}
                      />
                    </div>
                  ) : null;
                })()}

                {/* Feedback Button - Show for participants when event is completed OR when user has checked in */}
                {isParticipant && myParticipation?.invitationStatus === 'accepted' && 
                 (event.status === 'completed' || isCheckedIn) && id && (
                  <div className="mt-4">
                    <Button
                      onClick={() => setShowFeedbackModal(true)}
                      className={`w-full ${existingFeedback 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                    >
                      {existingFeedback ? (
                        <>
                          <Edit className="mr-2 h-4 w-4" />
                          View/Edit Feedback
                        </>
                      ) : (
                        <>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Submit Feedback
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recommendations - Show when available in ai_recommending, voting, or later stages */}
          {recommendations.length > 0 && ['ai_recommending', 'voting', 'confirmed', 'completed'].includes(event.status) && (
            <Card className="border-2 border-purple-200 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Sparkles className="mr-2 h-5 w-5 text-yellow-500" />
                      AI-recommended venues
                    </CardTitle>
                    {event.status === 'ai_recommending' && (
                      <CardDescription>
                        Recommendations are ready! Moving to voting phase...
                      </CardDescription>
                    )}
                  </div>
                  {(isOrganizer || (currentUserId && event.participants.some(p => p.userId === currentUserId && p.invitationStatus === 'accepted'))) && 
                   ['voting', 'ai_recommending'].includes(event.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddPlaceModal(true)}
                      className="ml-4"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Add venue
                    </Button>
                  )}
                </div>

                {/* Distance Controls */}
                {userLocation && recommendations.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    {/* Sort Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Sort by:</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={!sortByDistance ? "default" : "outline"}
                          onClick={() => setSortByDistance(false)}
                          className="h-8 text-xs"
                        >
                          AI Score
                        </Button>
                        <Button
                          size="sm"
                          variant={sortByDistance ? "default" : "outline"}
                          onClick={() => setSortByDistance(true)}
                          className="h-8 text-xs"
                        >
                          Distance
                        </Button>
                      </div>
                    </div>

                    {/* Transport Mode Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Transport:</span>
                      <div className="flex gap-1">
                        {[
                          { mode: 'car' as const, icon: '🚗', label: 'Car' },
                          { mode: 'moto' as const, icon: '🏍️', label: 'Moto' },
                          { mode: 'walk' as const, icon: '🚶', label: 'Walk' }
                        ].map(({ mode, icon, label }) => (
                          <Button
                            key={mode}
                            size="sm"
                            variant={transportMode === mode ? "default" : "outline"}
                            onClick={() => setTransportMode(mode)}
                            className="h-8 text-xs"
                          >
                            <span className="mr-1">{icon}</span>
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Loading indicator */}
                    {calculatingDistances && (
                      <div className="ml-auto text-xs text-gray-600 flex items-center">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1" />
                        Calculating distances...
                      </div>
                    )}
                  </div>
                )}

                {/* Location permission hint */}
                {!userLocation && recommendations.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-800">
                    📍 Enable location to see distances to each venue
                  </div>
                )}

                {/* Verification Status Summary Warning */}
                {(() => {
                  const pendingPlaces = displayRecommendations.filter(r => r.verificationStatus === 'Pending' && r.placeId);
                  const rejectedPlaces = displayRecommendations.filter(r => r.verificationStatus === 'Rejected' && r.placeId);
                  
                  if (pendingPlaces.length > 0 || rejectedPlaces.length > 0) {
                    return (
                      <div className="mt-4 space-y-2">
                        {pendingPlaces.length > 0 && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <Clock className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-yellow-900">
                                  {pendingPlaces.length} place{pendingPlaces.length > 1 ? 's' : ''} pending approval
                                </p>
                                <p className="text-xs text-yellow-700 mt-1">
                                  These places are awaiting moderator verification. You can vote, but cannot finalize until approved.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {rejectedPlaces.length > 0 && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-red-900">
                                  {rejectedPlaces.length} place{rejectedPlaces.length > 1 ? 's' : ''} rejected
                                </p>
                                <p className="text-xs text-red-700 mt-1">
                                  These places have been rejected by moderators and cannot be used for this event.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </CardHeader>
              <CardContent className="space-y-4">
                {displayRecommendations.map((rec) => (
                  <VenueRecommendationCard
                    key={rec.optionId}
                    recommendation={rec}
                    onVote={event.status === 'voting' ? handleVote : undefined}
                    onFinalize={isOrganizer && event.status === 'voting' ? handleFinalizeEvent : undefined}
                    onAddToSystem={handleAddToSystem}
                    voteStats={voteStats}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* AI Analyzing Status - Show detailed progress when recommendations are being generated */}
          {event.status === 'ai_recommending' && recommendations.length === 0 && !event.finalPlaceName && (
            <Card className="border-purple-200 bg-purple-50 shadow-lg animate-pulse">
              <CardHeader>
                <CardTitle className="text-purple-900 flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600 mr-2"></div>
                  AI is analyzing and generating recommendations...
                </CardTitle>
                <CardDescription className="text-purple-700">
                  We are analyzing your team’s preferences and generating smart venue suggestions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Steps */}
                  <div className="space-y-3">
                    {/* Step 1: Gathering Preferences */}
                    <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                      aiProgressStep >= 1 
                        ? 'bg-white border-green-200' 
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}>
                      <div className="flex-shrink-0">
                        {aiProgressStep >= 1 ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          aiProgressStep >= 1 ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          Collecting team preferences
                        </p>
                        <p className={`text-xs ${
                          aiProgressStep >= 1 ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {aiProgressStep >= 1 
                            ? aiProgressDetails?.preferencesCollected 
                              ? `Collected ${aiProgressDetails.preferencesCollected}/${aiProgressDetails.totalParticipants || 0} preference responses`
                              : 'Completed'
                            : 'Waiting...'}
                        </p>
                      </div>
                    </div>

                    {/* Step 2: Analyzing Preferences */}
                    <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                      aiProgressStep >= 2 
                        ? 'bg-white border-purple-200' 
                        : aiProgressStep === 1
                        ? 'bg-white border-purple-200'
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}>
                      <div className="flex-shrink-0">
                        {aiProgressStep > 2 ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : aiProgressStep === 2 ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          aiProgressStep >= 1 ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          Analyzing preferences and requirements
                        </p>
                        <p className={`text-xs ${
                          aiProgressStep === 2 ? 'text-purple-600' : aiProgressStep > 2 ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {aiProgressStep > 2 
                            ? aiProgressDetails?.cuisineTypesIdentified 
                              ? `Identified ${aiProgressDetails.cuisineTypesIdentified} cuisine types`
                              : 'Completed'
                            : aiProgressStep === 2 ? 'Analyzing...' : 'Waiting...'}
                        </p>
                      </div>
                    </div>

                    {/* Step 3: Searching Venues */}
                    <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                      aiProgressStep >= 3 
                        ? 'bg-white border-purple-200' 
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}>
                      <div className="flex-shrink-0">
                        {aiProgressStep > 3 ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : aiProgressStep === 3 ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          aiProgressStep >= 3 ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          Searching for suitable venues
                        </p>
                        <p className={`text-xs ${
                          aiProgressStep === 3 ? 'text-purple-600' : aiProgressStep > 3 ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {aiProgressStep > 3 
                            ? aiProgressDetails?.venuesFound 
                              ? `Found ${aiProgressDetails.venuesFound} venues (${aiProgressDetails.venuesFromTrackAsia || 0} from TrackAsia, ${aiProgressDetails.venuesFromDatabase || 0} from our database)`
                              : 'Completed'
                            : aiProgressStep === 3 ? 'Searching...' : 'Waiting...'}
                        </p>
                      </div>
                    </div>

                    {/* Step 4: Evaluating Venues */}
                    <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                      aiProgressStep >= 4 
                        ? 'bg-white border-purple-200' 
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}>
                      <div className="flex-shrink-0">
                        {aiProgressStep > 4 ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : aiProgressStep === 4 ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          aiProgressStep >= 4 ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          Evaluating and scoring venues
                        </p>
                        <p className={`text-xs ${
                          aiProgressStep === 4 ? 'text-purple-600' : aiProgressStep > 4 ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {aiProgressStep > 4 
                            ? aiProgressDetails?.venuesScored 
                              ? `Evaluated ${aiProgressDetails.venuesEvaluated || 0} venues, ${aiProgressDetails.venuesScored} meet your criteria`
                              : 'Completed'
                            : aiProgressStep === 4 ? 'Evaluating...' : 'Waiting...'}
                        </p>
                      </div>
                    </div>

                    {/* Step 5: Generating Recommendations */}
                    <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                      aiProgressStep >= 5 
                        ? 'bg-white border-green-200' 
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}>
                      <div className="flex-shrink-0">
                        {aiProgressStep >= 5 ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          aiProgressStep >= 5 ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          Building recommendation list
                        </p>
                        <p className={`text-xs ${
                          aiProgressStep >= 5 ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {aiProgressStep >= 5 
                            ? aiProgressDetails?.finalRecommendationsCount 
                              ? `Generated ${aiProgressDetails.finalRecommendationsCount} recommendations${aiProgressDetails.geminiAnalysisCompleted ? ' (with AI insights)' : aiProgressDetails.geminiTimeout ? ' (AI timeout, using scoring only)' : ''}`
                              : 'Completed'
                            : 'Waiting...'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>~{aiProgressDetails?.progressPercentage ? Math.round(aiProgressDetails.progressPercentage) : Math.min(aiProgressStep * 20, 100)}%</span>
                    </div>
                    <Progress value={aiProgressDetails?.progressPercentage || Math.min(aiProgressStep * 20, 100)} className="h-2" />
                    <p className="text-xs text-gray-500 mt-2">
                      {aiProgressDetails?.progressPercentage 
                        ? `Progress: ${Math.round(aiProgressDetails.progressPercentage)}%`
                        : aiProgressStep < 5 
                          ? `Estimated remaining time: ${Math.max(0, 60 - (aiProgressStep * 15))}-${Math.max(0, 90 - (aiProgressStep * 15))} seconds`
                          : 'Wrapping up...'}
                    </p>
                  </div>

                  {/* Retry/Regenerate Button - Always show to allow user to retry */}
                  <div className="mt-4 pt-4 border-t border-purple-200">
                    {aiAnalysisStartTime && (Date.now() - aiAnalysisStartTime.getTime()) > 120000 && (
                      <p className="text-xs text-purple-700 mb-3">
                        This is taking longer than expected. You can try generating recommendations again.
                      </p>
                    )}
                    <Button
                      onClick={() => handleGenerateRecommendations()}
                      disabled={generatingRecommendations}
                      variant="outline"
                      className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      {generatingRecommendations ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2" />
                          <span>Regenerating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          <span>Regenerate Recommendations</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state when no recommendations are available after AI step */}
          {['ai_recommending', 'voting', 'confirmed', 'completed'].includes(event.status) &&
           recommendations.length === 0 &&
           event.status !== 'ai_recommending' && (
            <Card className="border-dashed border-purple-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center text-purple-900">
                  <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                  No venue recommendations yet
                </CardTitle>
                <CardDescription className="text-sm">
                  AI has not produced any venue options yet. You can try generating recommendations again or add a place manually.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* No Recommendations Message */}
          {event.status === 'voting' && recommendations.length === 0 && !event.finalPlaceName && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-900 flex items-center">
                  <Sparkles className="mr-2 h-5 w-5" />
                  No venue recommendations yet
                </CardTitle>
                <CardDescription>
                  We’re still waiting for AI to generate venue recommendations. Please check back soon.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Voting Progress */}
          {event.status === 'voting' && voteStats && (
            <Card className="border-2 border-blue-200 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Voting Progress
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={autoRefresh ? 'bg-green-50 border-green-500 text-green-700' : ''}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                    {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{voteStats.votedCount} / {voteStats.totalParticipants} voted</span>
                    <span className="font-bold text-blue-600">{voteStats.voteProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={voteStats.voteProgress} className="h-3" />
                  {voteStats.timeRemaining && (
                    <p className="text-sm text-gray-500 flex items-center mt-2">
                      <Clock className="mr-1 h-4 w-4" />
                      Time remaining: {voteStats.timeRemaining}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Participants List */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5 text-purple-600" />
                  Participants
                </CardTitle>
                <Badge className="bg-purple-600">{event.participants.length}</Badge>
              </div>
              <CardDescription>
                {event.acceptedCount} accepted • {event.participants.filter(p => p.invitationStatus === 'pending').length} pending
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto">
              <div className="space-y-3">
                {event.participants.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No participants yet</p>
                    {isOrganizer && (
                      <Button
                        size="sm"
                        className="mt-4"
                        onClick={() => setShowInviteModal(true)}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite People
                      </Button>
                    )}
                  </div>
                ) : (
                  invitationParticipants.map((participant) => {
                    const avatarUrl = participant.profilePictureUrl;
                                     
                    return (
                      <div 
                        key={participant.userId} 
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all border border-gray-100 hover:border-gray-200"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="relative">
                            <Avatar className="h-10 w-10 shadow-md border-2 border-white">
                              <AvatarImage 
                                src={avatarUrl} 
                                alt={participant.fullName || participant.email || 'Participant'} 
                                className="object-cover"
                              />
                              <AvatarFallback 
                                className={`
                                  text-white font-semibold text-sm
                                  ${participant.invitationStatus === 'accepted' ? 'bg-gradient-to-br from-green-400 to-green-600' : 
                                    participant.invitationStatus === 'declined' ? 'bg-gradient-to-br from-red-400 to-red-600' : 
                                    'bg-gradient-to-br from-gray-400 to-gray-600'}
                                `}
                              >
                                {participant.fullName?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            {participant.invitationStatus === 'accepted' && (
                              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 z-10">
                                <CheckCircle className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {participant.fullName || participant.email}
                            </p>
                            <p className="text-xs text-gray-500 truncate flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {participant.email}
                            </p>
                          </div>
                        </div>
                      <Badge 
                        variant={
                          participant.invitationStatus === 'accepted' ? 'default' :
                          participant.invitationStatus === 'declined' ? 'destructive' :
                          'secondary'
                        }
                        className="text-xs shrink-0 ml-2"
                      >
                        {participant.invitationStatus}
                      </Badge>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
            {isOrganizer && event.participants.length > 0 && isEditable && (
              <CardFooter className="bg-gray-50 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-dashed border-2 border-blue-300 text-blue-600 hover:bg-blue-50 hover:!text-blue-600 hover:border-blue-400"
                  onClick={() => {
                    if (isDeadlinePassed) {
                      toast.error('Invitation deadline has passed');
                      return;
                    }
                    if (!canSendInvitations) {
                      toast.error(`Cannot invite more members in ${event.status} status`);
                      return;
                    }
                    setShowInviteModal(true);
                  }}
                  disabled={!canSendInvitations}
                >
                  <UserPlus className="h-4 w-4" />
                  Invite More
                </Button>
                
                <Button
                  variant="outline"
                  className="flex-1 border-dashed border-2 border-purple-300 text-purple-600 hover:bg-purple-50 hover:!text-purple-600 hover:border-purple-400"
                  onClick={() => setShowManageInvitationsModal(true)}
                >
                  <Users className="h-4 w-4" />
                  Manage Invitations
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Event Progress Workflow */}
          <Card className="shadow-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="text-blue-900 flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Event Progress
              </CardTitle>
              <CardDescription className="text-blue-700">
                Follow the event workflow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step 1 */}
              <div className={`flex items-start space-x-3 p-3 rounded-lg ${
                ['planning', 'inviting', 'gathering_preferences', 'ai_recommending', 'voting', 'confirmed'].includes(event.status) 
                  ? 'bg-green-100 border-l-4 border-green-500' 
                  : 'bg-white border-l-4 border-gray-300'
              }`}>
                <div className={`mt-0.5 ${
                  ['planning', 'inviting', 'gathering_preferences', 'ai_recommending', 'voting', 'confirmed'].includes(event.status)
                    ? 'text-green-600' 
                    : 'text-gray-400'
                }`}>
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">Create & Invite</p>
                  <p className="text-xs text-gray-600">Set up event and invite team members</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`flex items-start space-x-3 p-3 rounded-lg ${
                ['gathering_preferences', 'ai_recommending', 'voting', 'confirmed'].includes(event.status)
                  ? 'bg-green-100 border-l-4 border-green-500'
                  : event.status === 'inviting'
                  ? 'bg-yellow-100 border-l-4 border-yellow-500'
                  : 'bg-white border-l-4 border-gray-300'
              }`}>
                <div className={`mt-0.5 ${
                  ['gathering_preferences', 'ai_recommending', 'voting', 'confirmed'].includes(event.status)
                    ? 'text-green-600'
                    : event.status === 'inviting'
                    ? 'text-yellow-600'
                    : 'text-gray-400'
                }`}>
                  {['gathering_preferences', 'ai_recommending', 'voting', 'confirmed'].includes(event.status) ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Users className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">Accept Invitations</p>
                  <p className="text-xs text-gray-600">
                    {Math.round((event.acceptanceThreshold || 0.7) * 100)}% acceptance required
                  </p>
                  <Progress 
                    value={(event.acceptedCount / event.expectedAttendees) * 100} 
                    className="h-1.5 mt-2"
                  />
                </div>
              </div>

              {/* Step 3 */}
              <div className={`flex items-start space-x-3 p-3 rounded-lg ${
                ['ai_recommending', 'voting', 'confirmed'].includes(event.status)
                  ? 'bg-green-100 border-l-4 border-green-500'
                  : event.status === 'gathering_preferences'
                  ? 'bg-yellow-100 border-l-4 border-yellow-500'
                  : 'bg-white border-l-4 border-gray-300'
              }`}>
                <div className={`mt-0.5 ${
                  ['ai_recommending', 'voting', 'confirmed'].includes(event.status)
                    ? 'text-green-600'
                    : event.status === 'gathering_preferences'
                    ? 'text-yellow-600'
                    : 'text-gray-400'
                }`}>
                  {['ai_recommending', 'voting', 'confirmed'].includes(event.status) ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <MessageSquare className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">Gather Preferences</p>
                  <p className="text-xs text-gray-600">Team shares venue preferences</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className={`flex items-start space-x-3 p-3 rounded-lg ${
                ['voting', 'confirmed'].includes(event.status)
                  ? 'bg-green-100 border-l-4 border-green-500'
                  : event.status === 'ai_recommending'
                  ? 'bg-purple-100 border-l-4 border-purple-500'
                  : 'bg-white border-l-4 border-gray-300'
              }`}>
                <div className={`mt-0.5 ${
                  ['voting', 'confirmed'].includes(event.status)
                    ? 'text-green-600'
                    : event.status === 'ai_recommending'
                    ? 'text-purple-600'
                    : 'text-gray-400'
                }`}>
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">AI Recommendations</p>
                  <p className="text-xs text-gray-600">Smart venue suggestions</p>
                </div>
              </div>

              {/* Step 5 */}
              <div className={`flex items-start space-x-3 p-3 rounded-lg ${
                event.status === 'confirmed'
                  ? 'bg-green-100 border-l-4 border-green-500'
                  : event.status === 'voting'
                  ? 'bg-blue-100 border-l-4 border-blue-500'
                  : 'bg-white border-l-4 border-gray-300'
              }`}>
                <div className={`mt-0.5 ${
                  event.status === 'confirmed'
                    ? 'text-green-600'
                    : event.status === 'voting'
                    ? 'text-blue-600'
                    : 'text-gray-400'
                }`}>
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">Team Voting</p>
                  <p className="text-xs text-gray-600">Vote for favorite venues</p>
                </div>
              </div>

              {/* Step 6 */}
              <div className={`flex items-start space-x-3 p-3 rounded-lg ${
                event.status === 'confirmed'
                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-l-4 border-green-500 shadow-md'
                  : 'bg-white border-l-4 border-gray-300'
              }`}>
                <div className={`mt-0.5 ${
                  event.status === 'confirmed' ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {event.status === 'confirmed' ? (
                    <Star className="h-5 w-5" />
                  ) : (
                    <MapPin className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">Venue Confirmed</p>
                  <p className="text-xs text-gray-600">Event is ready to go!</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {(isOrganizer || isParticipant) && isEditable && (
            <Card className="shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
              <CardHeader>
                <CardTitle className="text-amber-900 flex items-center text-sm">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isOrganizer && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-white hover:bg-amber-50 text-gray-900 hover:text-gray-900 border-gray-200 hover:border-amber-300 relative z-10"
                      onClick={() => {
                        if (isDeadlinePassed) {
                          toast.error('Invitation deadline has passed');
                          return;
                        }
                        if (!canSendInvitations) {
                          toast.error(`Cannot invite participants in current status: ${event.status}`);
                          return;
                        }
                        setShowInviteModal(true);
                      }}
                      disabled={!canSendInvitations}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite Participants
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-white hover:bg-amber-50 text-gray-900 hover:text-gray-900 border-gray-200 hover:border-amber-300 relative z-10"
                      onClick={() => setShowUpdateModal(true)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Event Details
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-white hover:bg-amber-50 text-gray-900 hover:text-gray-900 border-gray-200 hover:border-amber-300 relative z-10"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success('Link copied!');
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Event Link
                    </Button>
                    {event && (event.status === 'confirmed' || event.status === 'completed') && (
                      <Button
                        variant="outline"
                        className="w-full justify-start bg-white hover:bg-amber-50 text-gray-900 hover:text-gray-900 border-gray-200 hover:border-amber-300 relative z-10"
                        onClick={() => navigate(`/user/events/${id}/analytics`)}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View Analytics
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white hover:bg-amber-50 text-gray-900 hover:text-gray-900 border-gray-200 hover:border-amber-300 relative z-10"
                  onClick={() => navigate(`/user/events/${id}/chat`)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Event Chat
                </Button>
                {isOrganizer && (
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-white hover:bg-amber-50 text-gray-900 hover:text-gray-900 border-gray-200 hover:border-amber-300 relative z-10"
                    onClick={() => navigate(`/user/events/${id}/waitlist`)}
                  >
                    <UserCog className="mr-2 h-4 w-4" />
                    Manage Waitlist
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      </div>

      {/* Modals */}
      <InviteParticipantsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteParticipants}
        eventTitle={event.title}
        alreadyInvitedIds={alreadyInvitedIds}
      />

      {id && (
        <ManageInvitationsModal
          isOpen={showManageInvitationsModal}
          onClose={() => setShowManageInvitationsModal(false)}
          eventId={id}
          participants={invitationParticipants}
          onRefresh={fetchEventDetails}
          organizerId={event.organizerId}
        />
      )}

      <UpdateEventModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        event={event}
        onUpdate={handleUpdateEvent}
      />

      {event && (
        <ShareEventModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          eventId={event.eventId}
          eventTitle={event.title}
          onShareSuccess={() => {
            // Optionally refresh event details or show a success message
            fetchEventDetails();
          }}
        />
      )}

      <CancelEventModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
        eventTitle={event?.title}
      />

      {event && id && (
        <AddPlaceOptionModal
          isOpen={showAddPlaceModal}
          onClose={() => setShowAddPlaceModal(false)}
          eventId={id}
          onSuccess={() => {
            fetchRecommendations();
            fetchEventDetails();
          }}
          eventLocation={event.finalPlaceId ? undefined : { lat: 10.7769, lng: 106.7009 }}
        />
      )}

      <LocationPickerModal
        isOpen={showLocationPickerModal}
        onClose={() => setShowLocationPickerModal(false)}
        onConfirm={handleLocationConfirm}
        defaultLocation={event?.finalPlaceId ? undefined : { lat: 10.7769, lng: 106.7009 }}
        defaultRadius={5}
      />

      {id && (
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          eventId={id}
          existingFeedback={existingFeedback}
          onSubmitSuccess={() => {
            checkFeedbackStatus(); // Refresh feedback status
            fetchEventDetails(); // Refresh event data
            setShowFeedbackModal(false);
          }}
        />
      )}
    </div>
  );
};

export default EventDetailPage;

