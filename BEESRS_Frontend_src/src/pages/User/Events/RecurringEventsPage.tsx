import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  Repeat,
  Plus,
  Edit,
  Trash2,
  Eye,
  CalendarCheck,
  Infinity,
  Users,
  DollarSign,
  AlertCircle,
  Power,
  PowerOff
} from 'lucide-react';
import eventService from '../../../services/eventService';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardFooter } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { format } from 'date-fns';
import CreateRecurringEventModal from '../../../components/Event/CreateRecurringEventModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { convertUtcToLocalTime, getTimezoneFromStorage } from '../../../utils/timezone';

interface RecurringEvent {
  recurringEventId: string;
  title: string;
  description?: string;
  eventType: string;
  recurrencePattern: string;
  daysOfWeek?: string;
  dayOfMonth?: number;
  scheduledTime: string;
  estimatedDuration?: number;
  expectedAttendees: number;
  budgetPerPerson?: number;
  startDate: string;
  endDate?: string;
  occurrenceCount?: number;
  autoCreateEvents: boolean;
  daysInAdvance: number;
  isActive: boolean;
  createdAt: string;
  nextOccurrence?: string;
  eventsCreated?: number;
  imageUrl?: string;
  eventImageUrl?: string;
}

const RecurringEventsPage: React.FC = () => {
  const [recurringEvents, setRecurringEvents] = useState<RecurringEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<RecurringEvent | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRecurringEvents();
  }, []);

  const fetchRecurringEvents = async () => {
    try {
      setLoading(true);
      const events = await eventService.getRecurringEvents();
      // Map Status from backend to isActive for frontend
      const mappedEvents = events.map((event: any) => ({
        ...event,
        isActive: event.status === 'active' || event.Status === 'active',
      }));
      setRecurringEvents(mappedEvents);
    } catch (error: any) {
      toast.error('Failed to fetch recurring events');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (event: RecurringEvent) => {
    setSelectedEvent(event);
    setShowViewModal(true);
  };

  const handleEdit = (event: RecurringEvent) => {
    setSelectedEvent(event);
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    
    try {
      setDeleting(true);
      await eventService.deleteRecurringEvent(selectedEvent.recurringEventId);
      toast.success('Recurring event deleted successfully');
      setShowDeleteDialog(false);
      setSelectedEvent(null);
      fetchRecurringEvents();
    } catch (error: any) {
      toast.error('Failed to delete recurring event: ' + (error.response?.data?.message || error.message));
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (event: RecurringEvent) => {
    try {
      const newStatus = event.isActive ? 'paused' : 'active';
      await eventService.toggleRecurringEventStatus(event.recurringEventId, newStatus);
      toast.success(`Recurring event ${newStatus === 'active' ? 'activated' : 'paused'} successfully`);
      fetchRecurringEvents();
    } catch (error: any) {
      toast.error('Failed to toggle status: ' + (error.response?.data?.message || error.message));
    }
  };

  const getRecurrenceDisplay = (event: RecurringEvent) => {
    switch (event.recurrencePattern.toLowerCase()) {
      case 'daily':
        return 'Every day';
      case 'weekly':
        if (event.daysOfWeek) {
          const days = event.daysOfWeek.split(',').join(', ');
          return `Every ${days}`;
        }
        return 'Weekly';
      case 'monthly':
        return `Monthly on day ${event.dayOfMonth || 1}`;
      case 'yearly':
        return 'Yearly';
      default:
        return event.recurrencePattern;
    }
  };

  const getAvatarGradient = () => {
    // Neutral gradient for all patterns
    return 'from-slate-600 to-slate-700';
  };

  const getEventAvatar = (event: RecurringEvent) => {
    const imageUrl = event.imageUrl || event.eventImageUrl;
    const avatarGradient = getAvatarGradient();
    const initials = event.title.charAt(0).toUpperCase();

    if (imageUrl) {
      return (
        <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-sm border border-slate-200">
          <img
            src={imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }}
          />
          <div
            className={`avatar-fallback w-full h-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-semibold text-sm`}
            style={{ display: 'none' }}
          >
            {initials}
          </div>
        </div>
      );
    }

    return (
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-semibold text-sm shadow-sm border border-slate-300 flex-shrink-0`}>
        {initials}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          <span className="text-slate-700">Loading recurring events...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Repeat className="h-6 w-6 text-slate-700" />
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
                  Recurring Events
                </h1>
              </div>
              <p className="text-sm text-slate-600">
                Manage your recurring event schedules and templates
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm font-semibold px-4 py-2 text-sm"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create Recurring Event
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card className="border-l-2 border-l-slate-400 shadow-sm bg-white">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Total Recurring</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">
                    {recurringEvents.length}
                  </p>
                </div>
                <Repeat className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-2 border-l-slate-400 shadow-sm bg-white">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Active</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">
                    {recurringEvents.filter((e) => e.isActive).length}
                  </p>
                </div>
                <CalendarCheck className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-2 border-l-slate-400 shadow-sm bg-white">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Events Created</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">
                    {recurringEvents.reduce((sum, e) => sum + (e.eventsCreated || 0), 0)}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-2 border-l-slate-400 shadow-sm bg-white">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Upcoming</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">
                    {
                      recurringEvents.filter(
                        (e) => e.isActive && e.nextOccurrence
                      ).length
                    }
                  </p>
                </div>
                <Clock className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recurring Events List */}
        {recurringEvents.length === 0 ? (
          <Card className="shadow-sm border-0">
            <CardContent className="py-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-3">
                  <Repeat className="h-6 w-6 text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                  No Recurring Events Yet
                </h3>
                <p className="text-sm text-slate-600 mb-4 max-w-md mx-auto">
                  Create your first recurring event to automatically schedule regular
                  team gatherings
                </p>
                <Button
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Recurring Event
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recurringEvents.map((event) => (
              <Card
                key={event.recurringEventId}
                className="shadow-sm hover:shadow-md transition-all duration-200 border overflow-hidden"
              >
                {/* Card Header - Neutral */}
                <div className="bg-slate-50 border-b border-slate-200 p-2.5">
                  <div className="flex items-start gap-2.5">
                    {/* Avatar */}
                    {getEventAvatar(event)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-xs px-1.5 py-0 bg-white border-slate-300">
                          {event.recurrencePattern}
                        </Badge>
                        {!event.isActive && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">Inactive</Badge>
                        )}
                      </div>
                      <h3 className="text-base font-semibold mb-0.5 truncate text-slate-900">{event.title}</h3>
                      {event.description && (
                        <p className="text-slate-600 text-xs line-clamp-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <CardContent className="p-2.5 space-y-1.5">
                  {/* Compact Info Grid */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-50 border border-slate-200">
                      <Repeat className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-500 leading-tight">Repeats</p>
                        <p className="text-xs font-semibold text-slate-900 truncate leading-tight">
                          {getRecurrenceDisplay(event)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-50 border border-slate-200">
                      <Clock className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-500 leading-tight">Time</p>
                        <p className="text-xs font-semibold leading-tight">
                          {convertUtcToLocalTime(event.scheduledTime, getTimezoneFromStorage() || 'UTC+07:00')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-50 border border-slate-200">
                      <Users className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-500 leading-tight">Attendees</p>
                        <p className="text-xs font-semibold leading-tight">
                          {event.expectedAttendees}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-50 border border-slate-200">
                      <Calendar className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-500 leading-tight">Schedule</p>
                        <p className="text-xs font-semibold text-slate-900 truncate leading-tight">
                          {format(new Date(event.startDate), 'MMM dd')}
                          {event.endDate ? (
                            <> → {format(new Date(event.endDate), 'MMM dd')}</>
                          ) : event.occurrenceCount ? (
                            <> ({event.occurrenceCount}x)</>
                          ) : (
                            <Infinity className="h-2.5 w-2.5 inline" />
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Next Occurrence - Compact */}
                  {event.nextOccurrence && event.isActive && (
                    <div className="flex items-center gap-1.5 p-1.5 rounded bg-green-50 border border-green-200">
                      <CalendarCheck className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-green-600 font-medium leading-tight">
                          Next
                        </p>
                        <p className="text-xs font-semibold text-green-900 truncate leading-tight">
                          {format(new Date(event.nextOccurrence), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Stats - Compact */}
                  <div className="flex items-center justify-between text-[10px] pt-0.5">
                    <span className="text-gray-600">
                      Created: <span className="font-semibold text-slate-900">{event.eventsCreated || 0}</span>
                    </span>
                    {event.budgetPerPerson && (
                      <div className="flex items-center gap-0.5 text-slate-700">
                        <DollarSign className="h-3 w-3" />
                        <span className="font-semibold">${event.budgetPerPerson}</span>
                        <span className="text-slate-500">/p</span>
                      </div>
                    )}
                  </div>

                  {/* Auto-create Badge - Compact */}
                  {event.autoCreateEvents && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">Auto {event.daysInAdvance}d ahead</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="bg-slate-50 border-t border-slate-200 p-1.5 flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-[10px] px-1.5 py-0.5 h-6"
                    onClick={() => handleView(event)}
                  >
                    <Eye className="mr-0.5 h-3 w-3" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-[10px] px-1.5 py-0.5 h-6"
                    onClick={() => handleEdit(event)}
                  >
                    <Edit className="mr-0.5 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant={event.isActive ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleToggleStatus(event)}
                    className={`text-[10px] px-1.5 py-0.5 h-6 ${event.isActive ? "border-slate-300 text-slate-700 hover:bg-slate-100" : "bg-slate-900 hover:bg-slate-800 text-white"}`}
                    title={event.isActive ? "Pause recurring event" : "Activate recurring event"}
                  >
                    {event.isActive ? (
                      <>
                        <PowerOff className="mr-0.5 h-3 w-3" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Power className="mr-0.5 h-3 w-3" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="px-1.5 py-0.5 h-6"
                    onClick={() => {
                      setSelectedEvent(event);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateRecurringEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchRecurringEvents();
        }}
      />

      {/* Edit Modal */}
      {showEditModal && selectedEvent && (
        <CreateRecurringEventModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEvent(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedEvent(null);
            fetchRecurringEvents();
          }}
          initialData={selectedEvent}
        />
      )}

      {/* View Modal */}
      {showViewModal && selectedEvent && (
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">{selectedEvent.title}</DialogTitle>
              <DialogDescription>
                {selectedEvent.description || 'No description provided'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Event Type</p>
                  <p className="text-base font-semibold">{selectedEvent.eventType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Recurrence Pattern</p>
                  <p className="text-base font-semibold capitalize">{selectedEvent.recurrencePattern}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Repeats</p>
                  <p className="text-base font-semibold">{getRecurrenceDisplay(selectedEvent)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Time</p>
                  <p className="text-base font-semibold">
                    {convertUtcToLocalTime(selectedEvent.scheduledTime, getTimezoneFromStorage() || 'UTC+07:00')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Duration</p>
                  <p className="text-base font-semibold">{selectedEvent.estimatedDuration || 'N/A'} hours</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Expected Attendees</p>
                  <p className="text-base font-semibold">{selectedEvent.expectedAttendees}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Budget per Person</p>
                  <p className="text-base font-semibold">${selectedEvent.budgetPerPerson || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Status</p>
                  <Badge variant={selectedEvent.isActive ? 'default' : 'destructive'}>
                    {selectedEvent.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Start Date</p>
                  <p className="text-base font-semibold">{format(new Date(selectedEvent.startDate), 'MMM dd, yyyy')}</p>
                </div>
                {selectedEvent.endDate && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">End Date</p>
                    <p className="text-base font-semibold">{format(new Date(selectedEvent.endDate), 'MMM dd, yyyy')}</p>
                  </div>
                )}
                {selectedEvent.nextOccurrence && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">Next Occurrence</p>
                    <p className="text-base font-semibold">{format(new Date(selectedEvent.nextOccurrence), 'MMM dd, yyyy')}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-slate-500">Events Created</p>
                  <p className="text-base font-semibold">{selectedEvent.eventsCreated || 0}</p>
                </div>
                {selectedEvent.autoCreateEvents && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">Auto-creates</p>
                    <p className="text-base font-semibold">{selectedEvent.daysInAdvance} days in advance</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowViewModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && selectedEvent && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Recurring Event</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedEvent.title}"? This action cannot be undone.
                {selectedEvent.eventsCreated && selectedEvent.eventsCreated > 0 && (
                  <span className="block mt-2 text-amber-600">
                    Note: {selectedEvent.eventsCreated} event(s) have already been created from this recurring event.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowDeleteDialog(false);
                setSelectedEvent(null);
              }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default RecurringEventsPage;

