import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Mail,
  Calendar,
  TrendingUp,
  ArrowUpCircle,
  MessageSquare
} from 'lucide-react';
import eventService from '../../../services/eventService';
import type { EventResponse } from '../../../types/event.types';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { format } from 'date-fns';

interface WaitlistEntry {
  waitlistId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  status: 'waiting' | 'promoted' | 'expired';
  priority?: number;
  notes?: string;
  joinedAt: string;
  promotedAt?: string;
  position: number;
}

const EventWaitlistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  // Get current user ID
  const authState = useSelector((state: any) => state.auth);
  const reduxCurrentUserId = authState?.decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
  
  const getCurrentUserId = (): string | null => {
    if (reduxCurrentUserId) return reduxCurrentUserId;
    const currentUser = authState?.user;
    if (currentUser?.userId) return currentUser.userId;
    if (currentUser?.id) return currentUser.id;
    
    try {
      const persistRoot = localStorage.getItem('persist:root');
      if (persistRoot) {
        const parsedPersist = JSON.parse(persistRoot);
        if (parsedPersist.auth) {
          const authData = JSON.parse(parsedPersist.auth);
          if (authData.decodedToken) {
            const userId = authData.decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
            if (userId) return userId;
          }
          if (authData.user?.userId) return authData.user.userId;
          if (authData.user?.id) return authData.user.id;
        }
      }
    } catch (e) {
      console.error('Error parsing persist:root:', e);
    }
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
               payload?.sub || payload?.userId || payload?.id || null;
      }
    } catch (e) {
      console.error('Error decoding token:', e);
    }
    
    return null;
  };
  
  const currentUserId = getCurrentUserId();
  
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventDetails();
      fetchWaitlist();
      checkWaitlistStatus();
    }
  }, [id, currentUserId]);

  const fetchEventDetails = async () => {
    if (!id) return;
    try {
      const eventData = await eventService.getEvent(id);
      setEvent(eventData);
      
      // Check if current user is a participant
      if (currentUserId) {
        const isUserParticipant = eventData.participants.some(
          (p: any) => p.userId === currentUserId
        );
        setIsParticipant(isUserParticipant);
      }
    } catch (error: any) {
      toast.error('Failed to fetch event details');
    }
  };

  const fetchWaitlist = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await eventService.getEventWaitlist(id);
      // Add mock position data if not available
      const waitlistWithPositions = data.map((entry: any, index: number) => ({
        ...entry,
        position: entry.position || index + 1,
      }));
      setWaitlist(waitlistWithPositions);
    } catch (error: any) {
      // If 403, user is not organizer - that's ok, they can still view waitlist
      if (error.response?.status !== 403) {
        // Silently fail - waitlist might not be accessible
      }
      setWaitlist([]);
    } finally {
      setLoading(false);
    }
  };

  const checkWaitlistStatus = async () => {
    if (!id || !currentUserId) return;
    try {
      const waitlistEntry = await eventService.getWaitlistStatus(id);
      setIsOnWaitlist(!!waitlistEntry && waitlistEntry.status === 'waiting');
    } catch (error: any) {
      // If 404, user is not on waitlist
      setIsOnWaitlist(false);
    }
  };

  const handlePromote = async (userId: string) => {
    if (!id) return;
    try {
      setPromoting(userId);
      await eventService.promoteFromWaitlist(id, userId);
      toast.success('User promoted successfully!');
      fetchWaitlist();
      fetchEventDetails();
    } catch (error: any) {
      toast.error('Failed to promote user: ' + (error.response?.data?.message || error.message));
    } finally {
      setPromoting(null);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!id) return;
    try {
      await eventService.joinWaitlist(id, 1, 'Interested in attending');
      toast.success('Added to waitlist successfully!');
      setIsOnWaitlist(true);
      fetchWaitlist();
      checkWaitlistStatus();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error('Failed to join waitlist: ' + errorMessage);
      
      // If already participant, update state
      if (errorMessage.toLowerCase().includes('already a participant')) {
        setIsParticipant(true);
      }
      // If already on waitlist, update state
      if (errorMessage.toLowerCase().includes('already on the waitlist')) {
        setIsOnWaitlist(true);
        checkWaitlistStatus();
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'from-yellow-400 to-yellow-600';
      case 'promoted':
        return 'from-green-400 to-green-600';
      case 'expired':
        return 'from-gray-400 to-gray-600';
      default:
        return 'from-blue-400 to-blue-600';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'secondary';
      case 'promoted':
        return 'default';
      case 'expired':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span>Loading waitlist...</span>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <p className="text-red-500">Event not found</p>
      </div>
    );
  }

  const waitingCount = waitlist.filter((w) => w.status === 'waiting').length;
  const promotedCount = waitlist.filter((w) => w.status === 'promoted').length;
  const spotsAvailable = (event.maxAttendees || event.expectedAttendees) - event.acceptedCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-2xl">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <Users className="h-10 w-10" />
                <h1 className="text-4xl lg:text-5xl font-bold drop-shadow-lg">
                  Event Waitlist
                </h1>
              </div>
              <p className="text-lg text-white/90 mb-2">{event.title}</p>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <Calendar className="h-5 w-5" />
                  <span>{format(new Date(event.scheduledDate), 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <Users className="h-5 w-5" />
                  <span>
                    {event.acceptedCount}/{event.maxAttendees || event.expectedAttendees} spots
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Stats Cards */}
          <Card className="border-l-4 border-l-yellow-500 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Waiting</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-1">{waitingCount}</p>
                </div>
                <Clock className="h-12 w-12 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Promoted</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{promotedCount}</p>
                </div>
                <CheckCircle2 className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Spots Available</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{Math.max(0, spotsAvailable)}</p>
                </div>
                <TrendingUp className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Waitlist</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">{waitlist.length}</p>
                </div>
                <Users className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Banner */}
        {spotsAvailable > 0 && waitingCount > 0 && (
          <Card className="mb-6 border-2 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">
                    {spotsAvailable} spot{spotsAvailable > 1 ? 's' : ''} available!
                  </p>
                  <p className="text-sm text-green-700">
                    You can promote {Math.min(spotsAvailable, waitingCount)} user
                    {Math.min(spotsAvailable, waitingCount) > 1 ? 's' : ''} from the waitlist
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Waitlist */}
        {waitlist.length === 0 ? (
          <Card className="shadow-2xl border-0">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 mb-6">
                  <Users className="h-10 w-10 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  No Waitlist Entries
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  When the event reaches capacity, interested users will be added to the
                  waitlist
                </p>
                {spotsAvailable > 0 ? (
                  <p className="text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-lg inline-block">
                    Event still has {spotsAvailable} spot{spotsAvailable > 1 ? 's' : ''}{' '}
                    available
                  </p>
                ) : isParticipant ? (
                  <div className="text-center">
                    <p className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg inline-block mb-2">
                      <CheckCircle2 className="inline mr-2 h-4 w-4" />
                      You are already a participant in this event
                    </p>
                    <p className="text-xs text-gray-500">
                      Participants cannot join the waitlist
                    </p>
                  </div>
                ) : isOnWaitlist ? (
                  <div className="text-center">
                    <p className="text-sm text-yellow-600 bg-yellow-50 px-4 py-2 rounded-lg inline-block mb-2">
                      <Clock className="inline mr-2 h-4 w-4" />
                      You are already on the waitlist
                    </p>
                    <p className="text-xs text-gray-500">
                      Waiting for available spots
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={handleJoinWaitlist}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Join Waitlist
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-2xl border-0">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b">
              <CardTitle className="flex items-center text-xl">
                <Users className="mr-2 h-6 w-6 text-purple-600" />
                Waitlist Queue
              </CardTitle>
              <CardDescription>
                Manage users waiting for available spots
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {waitlist.map((entry) => (
                  <div
                    key={entry.waitlistId}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start space-x-4 flex-1">
                        {/* Position Badge */}
                        <div
                          className={`flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${getStatusColor(
                            entry.status
                          )} flex items-center justify-center text-white font-bold text-lg shadow-md`}
                        >
                          {entry.position}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">
                              {entry.userName}
                            </h4>
                            <Badge variant={getStatusBadgeVariant(entry.status)}>
                              {entry.status}
                            </Badge>
                            {entry.priority && entry.priority > 1 && (
                              <Badge className="bg-orange-500">
                                Priority: {entry.priority}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center space-x-1">
                              <Mail className="h-4 w-4" />
                              <span>{entry.userEmail}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                Joined {format(new Date(entry.joinedAt), 'MMM dd, HH:mm')}
                              </span>
                            </div>
                          </div>

                          {entry.notes && (
                            <div className="flex items-start space-x-2 text-sm bg-blue-50 px-3 py-2 rounded-lg mt-2">
                              <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                              <p className="text-gray-700">{entry.notes}</p>
                            </div>
                          )}

                          {entry.promotedAt && (
                            <div className="flex items-center space-x-2 text-sm text-green-600 mt-2">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>
                                Promoted on {format(new Date(entry.promotedAt), 'MMM dd, HH:mm')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {entry.status === 'waiting' && spotsAvailable > 0 && (
                        <Button
                          onClick={() => handlePromote(entry.userId)}
                          disabled={promoting === entry.userId}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
                        >
                          {promoting === entry.userId ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                              Promoting...
                            </>
                          ) : (
                            <>
                              <ArrowUpCircle className="mr-2 h-4 w-4" />
                              Promote
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EventWaitlistPage;

