import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  Users,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  Building2,
  Lock,
  Globe,
  DollarSign,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import eventService from "../../../services/eventService";
import type { EventResponse } from "../../../types/event.types";
import {
  EVENT_STATE_LABELS,
  EVENT_STATE_ICONS,
  EVENT_STATES,
} from "../../../constants/eventConstants";
import { convertUtcToLocalTime } from "../../../utils/timezone";

const ITEMS_PER_PAGE = 12;

const BranchEventsSummaryPage: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [timeFilter, setTimeFilter] = useState<"Upcoming" | "Past" | "All">("All");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [branchId] = useState<string | undefined>(undefined);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const result = await eventService.getBranchEventsSummary(
        branchId,
        timeFilter !== "All" ? timeFilter : undefined,
        statusFilter !== "all" ? statusFilter : undefined,
        currentPage,
        ITEMS_PER_PAGE
      );
      setEvents(result.items);
      setTotalItems(result.totalItems);
    } catch (error) {
      console.error("Failed to load branch events:", error);
    } finally {
      setLoading(false);
    }
  }, [branchId, timeFilter, statusFilter, currentPage]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadEvents();
  };

  const filteredEvents = events.filter((event) => {
    // Only show events with status: Inviting, Confirmed, or Completed
    const allowedStatuses = [EVENT_STATES.INVITING, EVENT_STATES.CONFIRMED, EVENT_STATES.COMPLETED];
    if (!allowedStatuses.includes(event.status)) {
      return false;
    }

    // Apply search filter if search query exists
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.title.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.organizerName?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "voting":
        return "bg-blue-100 text-blue-800";
      case "ai_recommending":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timeString: string, timezone?: string) => {
    return convertUtcToLocalTime(timeString, timezone);
  };

  const EventCard: React.FC<{ event: EventResponse }> = ({ event }) => {
    const statusIcon = EVENT_STATE_ICONS[event.status] || "📅";
    const statusLabel = EVENT_STATE_LABELS[event.status] || event.status;
    const [requesting, setRequesting] = useState(false);
    
    // Get current user ID
    const authState = useSelector((state: any) => state.auth);
    const reduxCurrentUserId = authState?.decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
    
    const getCurrentUserId = (): string | null => {
      if (reduxCurrentUserId) return reduxCurrentUserId;
      const currentUser = authState?.user;
      if (currentUser?.userId) return currentUser.userId;
      if (currentUser?.id) return currentUser.id;
      return null;
    };
    
    const currentUserId = getCurrentUserId();
    
    // Check if user is already a participant (accepted or pending)
    const userParticipant = event.participants?.find(
      (p) => p.userId === currentUserId
    );
    const isParticipant = userParticipant !== undefined;
    const hasPendingRequest = userParticipant?.invitationStatus === "pending";
    
    // Check if event is in inviting status and has space
    const maxAttendees = event.maxAttendees || event.expectedAttendees;
    const hasSpace = event.acceptedCount < maxAttendees;
    const canRequestJoin = 
      event.status === EVENT_STATES.INVITING && 
      hasSpace && 
      !isParticipant &&
      !hasPendingRequest &&
      event.privacy === "Public";

    const handleRequestToJoin = async (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent card click navigation
      
      if (!currentUserId) {
        toast.error("Please login to request joining this event");
        return;
      }

      try {
        setRequesting(true);
        await eventService.requestToJoin(event.eventId);
        toast.success("Request to join sent successfully!");
        // Reload events to update the UI
        loadEvents();
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || "Failed to send request";
        toast.error(errorMessage);
      } finally {
        setRequesting(false);
      }
    };

    return (
      <motion.div
        onClick={() => navigate(`/user/events/${event.eventId}`)}
        className="group bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-2xl hover:border-purple-400 transition-all duration-300 cursor-pointer relative overflow-hidden h-full flex flex-col"
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative flex flex-col h-full">
          {/* Header - Fixed height */}
          <div className="flex items-start justify-between mb-4 min-h-[80px]">
            <div className="flex-1 pr-2">
              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors min-h-[56px]">
                {event.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span className="line-clamp-1">{event.organizerName || "Unknown Organizer"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {event.privacy === "Private" ? (
                <Lock className="w-5 h-5 text-gray-500" />
              ) : (
                <Globe className="w-5 h-5 text-blue-500" />
              )}
            </div>
          </div>

          {/* Description - Fixed height */}
          <div className="mb-4 min-h-[40px]">
            {event.description ? (
              <p className="text-gray-600 text-sm line-clamp-2">
                {event.description}
              </p>
            ) : (
              <div className="text-gray-400 text-sm italic">No description</div>
            )}
          </div>

          {/* Event Image - Fixed height */}
          <div className="mb-4 rounded-lg overflow-hidden h-48 flex-shrink-0">
            {event.eventImageUrl ? (
              <img
                src={event.eventImageUrl}
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                <Calendar className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>

          {/* Details - Fixed spacing */}
          <div className="space-y-3 mb-4 flex-1">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span className="font-medium">
                {formatDate(event.scheduledDate)}
              </span>
              <Clock className="w-4 h-4 text-purple-500 ml-2" />
              <span>{formatTime(event.scheduledTime, event.timezone)}</span>
            </div>

            {event.finalPlaceName ? (
              <div className="flex items-center gap-2 text-sm text-gray-700 min-h-[24px]">
                <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="line-clamp-1">{event.finalPlaceName}</span>
              </div>
            ) : (
              <div className="min-h-[24px]"></div>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-700 min-h-[24px]">
              <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>
                {event.acceptedCount} / {event.expectedAttendees} participants
              </span>
            </div>

            {event.budgetPerPerson ? (
              <div className="flex items-center gap-2 text-sm text-gray-700 min-h-[24px]">
                <DollarSign className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="font-semibold text-green-600">
                  ${event.budgetPerPerson.toFixed(2)} per person
                </span>
              </div>
            ) : (
              <div className="min-h-[24px]"></div>
            )}
          </div>

          {/* Status Badge and Request Button - Fixed at bottom */}
          <div className="flex items-center justify-between mt-auto pt-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                event.status
              )}`}
            >
              <span className="mr-1">{statusIcon}</span>
              {statusLabel}
            </span>
            <div className="flex items-center gap-2">
              {canRequestJoin && (
                <motion.button
                  onClick={handleRequestToJoin}
                  disabled={requesting}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {requesting ? (
                    <>
                      <Clock className="w-3 h-3 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3" />
                      Request to Join
                    </>
                  )}
                </motion.button>
              )}
              <span className="text-xs text-gray-500">
                {event.eventType}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Branch Events Summary
          </h1>
          <p className="text-gray-600">
            Track all activities happening at your branch
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-6"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </form>

            {/* Time Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setTimeFilter("All");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeFilter === "All"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  setTimeFilter("Upcoming");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeFilter === "Upcoming"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => {
                  setTimeFilter("Past");
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeFilter === "Past"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Past
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              {[EVENT_STATES.INVITING, EVENT_STATES.CONFIRMED, EVENT_STATES.COMPLETED].map((status) => (
                <option key={status} value={status}>
                  {EVENT_STATE_LABELS[status] || status}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Events Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white rounded-xl shadow-lg"
          >
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No events found
            </h3>
            <p className="text-gray-500">
              {searchQuery
                ? "Try adjusting your search or filters"
                : "No events match your current filters"}
            </p>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {filteredEvents.map((event) => (
                <EventCard key={event.eventId} event={event} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 bg-white rounded-xl shadow-lg p-4">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <span className="text-gray-700 font-medium">
                  Page {currentPage} of {totalPages} ({totalItems} total)
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BranchEventsSummaryPage;

