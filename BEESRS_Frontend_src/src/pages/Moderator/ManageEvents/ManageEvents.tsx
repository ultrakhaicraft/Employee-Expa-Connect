import { useState, useEffect } from 'react'
import { 
  Calendar, 
  Users, 
  MapPin, 
  Search, 
  Eye, 
  Trash2, 
  BarChart3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import PageTransition from '@/components/Transition/PageTransition'
import { 
  GetEventsInArea, 
  GetEventDetails,
  DeleteEvent
} from '@/services/moderatorService'
import type {
  ModeratorEvent,
  EventDetailResponse
} from '@/services/moderatorService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { convertUtcToLocalTime } from '@/utils/timezone'

export default function ManageEvents() {
  const [events, setEvents] = useState<ModeratorEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedEvent, setSelectedEvent] = useState<EventDetailResponse | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<ModeratorEvent | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const pageSize = 10
  const { toast } = useToast()

  const fetchEvents = async (page: number = 1) => {
    try {
      setLoading(true)
      setError('')
      
      const response = await GetEventsInArea({
        page,
        pageSize,
        status: statusFilter || undefined,
        search: searchTerm || undefined
      })

      setEvents(response.items || [])
      setTotalPages(Math.ceil((response.totalItems || 0) / pageSize))
      setTotalItems(response.totalItems || 0)
      setCurrentPage(response.page || 1)
    } catch (error: any) {
      console.error('Error fetching events:', error)
      setError(error.response?.data?.message || error.message || 'Failed to load events')
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to load events',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents(1)
  }, [statusFilter])

  const handleSearch = () => {
    setCurrentPage(1)
    fetchEvents(1)
  }

  const handleViewDetails = async (eventId: string) => {
    try {
      setLoadingDetail(true)
      const details = await GetEventDetails(eventId)
      setSelectedEvent(details)
      setIsDetailModalOpen(true)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load event details',
        variant: 'destructive'
      })
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleDeleteClick = (event: ModeratorEvent) => {
    setEventToDelete(event)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return

    try {
      setDeleting(true)
      await DeleteEvent(eventToDelete.eventId, deleteReason || 'Deleted by moderator')
      toast({
        title: 'Success',
        description: 'Event deleted successfully'
      })
      setIsDeleteDialogOpen(false)
      setEventToDelete(null)
      setDeleteReason('')
      fetchEvents(currentPage)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete event',
        variant: 'destructive'
      })
    } finally {
      setDeleting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'voting':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'inviting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'planning':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string, timeString: string, timezone?: string) => {
    // Convert UTC time to local timezone first
    const localTime = convertUtcToLocalTime(timeString, timezone);
    const parts = localTime.split(':')
    const hours = parseInt(parts[0])
    const minutes = parts[1]
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
    
    return `${formatDate(dateString)} at ${displayHours}:${minutes} ${period}`
  }

  return (
    <PageTransition delayMs={100} durationMs={600} variant="zoom">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Events</h1>
          <p className="text-gray-600 mt-2">View and manage events in your area</p>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="Search events by title, description, or organizer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="planning">Planning</option>
                <option value="inviting">Inviting</option>
                <option value="voting">Voting</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        {loading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">Loading events...</div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-red-500">{error}</div>
            </CardContent>
          </Card>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center">
                <Calendar className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Events Found</h3>
                <p className="text-gray-500 text-center max-w-md">
                  {searchTerm || statusFilter
                    ? 'No events match your search criteria. Try adjusting your filters.'
                    : 'There are no events in your area at this time.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Events ({totalItems})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Event</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Participants</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Organizer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <TableRow key={event.eventId} className="hover:bg-gray-50">
                          <TableCell>
                            <div>
                              <div className="font-medium">{event.title}</div>
                              {event.description && (
                                <div className="text-sm text-gray-500 line-clamp-1 mt-1">
                                  {event.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">{event.eventType}</span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{formatDate(event.scheduledDate)}</div>
                              <div className="text-gray-500">
                                {(() => {
                                  const localTime = convertUtcToLocalTime(event.scheduledTime, event.timezone);
                                  const parts = localTime.split(':')
                                  const hours = parseInt(parts[0])
                                  const minutes = parts[1]
                                  const period = hours >= 12 ? 'PM' : 'AM'
                                  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
                                  return `${displayHours}:${minutes} ${period}`
                                })()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Users className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">{event.acceptedParticipantsCount}</span>
                              <span className="text-gray-500">/ {event.expectedAttendees}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {event.finalPlaceName ? (
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span className="line-clamp-1">{event.finalPlaceName}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">Not set</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{event.organizerName || 'Unknown'}</div>
                              {event.organizerEmail && (
                                <div className="text-xs text-gray-500">{event.organizerEmail}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(event.status)}>
                              {event.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(event.eventId)}
                                disabled={loadingDetail}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(event)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} events
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchEvents(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => fetchEvents(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchEvents(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Event Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {loadingDetail ? (
              <div className="py-12 text-center">Loading event details...</div>
            ) : selectedEvent ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedEvent.title}</DialogTitle>
                  <DialogDescription>
                    {selectedEvent.eventType} • {formatDateTime(selectedEvent.scheduledDate, selectedEvent.scheduledTime, selectedEvent.timezone)}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <div className="mt-1">
                        <Badge className={getStatusColor(selectedEvent.status)}>
                          {selectedEvent.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Organizer</label>
                      <div className="mt-1">
                        <div className="font-medium">{selectedEvent.organizerName || 'Unknown'}</div>
                        {selectedEvent.organizerEmail && (
                          <div className="text-sm text-gray-500">{selectedEvent.organizerEmail}</div>
                        )}
                      </div>
                    </div>
                    {selectedEvent.finalPlaceName && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Location</label>
                        <div className="mt-1">
                          <div className="font-medium">{selectedEvent.finalPlaceName}</div>
                          {selectedEvent.finalPlaceAddress && (
                            <div className="text-sm text-gray-500">{selectedEvent.finalPlaceAddress}</div>
                          )}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Expected Attendees</label>
                      <div className="mt-1 font-medium">
                        {selectedEvent.expectedAttendees}
                        {selectedEvent.maxAttendees && ` / ${selectedEvent.maxAttendees} max`}
                      </div>
                    </div>
                  </div>

                  {selectedEvent.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Description</label>
                      <p className="mt-1 text-gray-700">{selectedEvent.description}</p>
                    </div>
                  )}

                  {/* Statistics */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Statistics
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold">{selectedEvent.statistics.participants.accepted}</div>
                          <div className="text-sm text-gray-500">Accepted</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {selectedEvent.statistics.participants.pending} pending, {selectedEvent.statistics.participants.declined} declined
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold">{selectedEvent.statistics.checkIns}</div>
                          <div className="text-sm text-gray-500">Check-ins</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {Math.round(selectedEvent.statistics.checkInRate)}% rate
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold">{selectedEvent.statistics.feedbacks}</div>
                          <div className="text-sm text-gray-500">Feedbacks</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {Math.round(selectedEvent.statistics.feedbackRate)}% rate
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold">{selectedEvent.statistics.ratings.overall.toFixed(1)}</div>
                          <div className="text-sm text-gray-500">Avg Rating</div>
                          <div className="text-xs text-gray-400 mt-1">
                            Venue: {selectedEvent.statistics.ratings.venue.toFixed(1)}, Food: {selectedEvent.statistics.ratings.food.toFixed(1)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Participants List */}
                  {selectedEvent.participants.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Participants ({selectedEvent.participants.length})</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>RSVP Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedEvent.participants.map((p, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{p.userName || 'Unknown'}</TableCell>
                                <TableCell>{p.userEmail || '-'}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{p.status}</Badge>
                                </TableCell>
                                <TableCell>
                                  {p.rsvpDate ? formatDate(p.rsvpDate) : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Check-ins */}
                  {selectedEvent.checkIns.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Check-ins ({selectedEvent.checkIns.length})</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Checked In At</TableHead>
                              <TableHead>Method</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedEvent.checkIns.map((ci, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{ci.userName || 'Unknown'}</TableCell>
                                <TableCell>{new Date(ci.checkedInAt).toLocaleString()}</TableCell>
                                <TableCell>{ci.checkInMethod || 'manual'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Feedbacks */}
                  {selectedEvent.feedbacks.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Feedbacks ({selectedEvent.feedbacks.length})</h3>
                      <div className="space-y-3">
                        {selectedEvent.feedbacks.map((fb, idx) => (
                          <Card key={idx}>
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="font-medium">{fb.userName || 'Unknown'}</div>
                                  <div className="text-sm text-gray-500">
                                    {new Date(fb.submittedAt).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Badge variant="outline">Venue: {fb.venueRating}/5</Badge>
                                  <Badge variant="outline">Food: {fb.foodRating}/5</Badge>
                                  <Badge variant="outline">Overall: {fb.overallRating}/5</Badge>
                                </div>
                              </div>
                              {fb.comments && (
                                <p className="text-sm text-gray-700 mt-2">{fb.comments}</p>
                              )}
                              {fb.suggestions && (
                                <p className="text-sm text-gray-600 mt-1 italic">Suggestion: {fb.suggestions}</p>
                              )}
                              {fb.wouldAttendAgain && (
                                <Badge className="mt-2 bg-green-100 text-green-800">Would attend again</Badge>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Event</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this event? This action will cancel the event and notify all participants.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              {eventToDelete && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium">{eventToDelete.title}</div>
                  <div className="text-sm text-gray-500">
                    {formatDateTime(eventToDelete.scheduledDate, eventToDelete.scheduledTime, eventToDelete.timezone)}
                  </div>
                </div>
              )}
              <label className="text-sm font-medium text-gray-700">Reason for deletion (optional)</label>
              <Textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter reason for deleting this event..."
                className="mt-2"
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setEventToDelete(null)
                setDeleteReason('')
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? 'Deleting...' : 'Delete Event'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageTransition>
  )
}
