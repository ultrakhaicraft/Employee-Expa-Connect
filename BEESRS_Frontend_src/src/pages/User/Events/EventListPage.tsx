import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Users, MapPin, Plus, Sparkles, Share2, Repeat, AlertTriangle, Search, Filter, ChevronLeft, ChevronRight, X, FileText, Building2 } from "lucide-react";
import eventService from "../../../services/eventService";
import type { EventResponse, EventShareViewResponse } from "../../../types/event.types";
import {
  EVENT_STATE_LABELS,
  EVENT_STATE_ICONS,
  MIN_ADVANCE_DAYS,
  EVENT_STATES,
} from "../../../constants/eventConstants";
import { convertUtcToLocalTime } from "../../../utils/timezone";

const ITEMS_PER_PAGE = 9;

const EventListPage: React.FC = () => {
  const navigate = useNavigate();
  const [myEvents, setMyEvents] = useState<EventResponse[]>([]);
  const [participatingEvents, setParticipatingEvents] = useState<EventResponse[]>([]);
  const [sharedEvents, setSharedEvents] = useState<EventShareViewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"organizing" | "participating" | "shared">("organizing");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, searchQuery]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const [myEventsData, participatingData, sharedData] = await Promise.all([
        eventService.getMyEvents(),
        eventService.getParticipatingEvents(),
        eventService.getSharedEventsWithMe().catch(() => []), // Gracefully handle errors
      ]);
      setMyEvents(myEventsData);
      setParticipatingEvents(participatingData);
      setSharedEvents(sharedData);
    } catch (error) {
      console.error("Failed to load events:", error);
    } finally {
      setLoading(false);
    }
  };

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

  // Check if event is scheduled less than 3 days in advance (BR_EVENT_01)
  const isEventScheduledTooSoon = (event: EventResponse): boolean => {
    const scheduledDateTime = new Date(`${event.scheduledDate}T${event.scheduledTime}`);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + MIN_ADVANCE_DAYS);
    return scheduledDateTime < minDate;
  };

  const SharedEventCard: React.FC<{ sharedEvent: EventShareViewResponse }> = ({ sharedEvent }) => (
    <motion.div
      onClick={() => navigate(`/user/events/${sharedEvent.eventId}`)}
      className="group bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-2xl hover:border-purple-400 transition-all duration-300 cursor-pointer relative overflow-hidden h-full"
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex-1 group-hover:text-purple-600 transition-colors">
            {sharedEvent.eventTitle}
          </h3>
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm bg-purple-100 text-purple-800">
            <Share2 className="h-3 w-3 inline mr-1" />
            Shared
          </span>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center text-gray-600">
            <Users className="mr-2 h-4 w-4 text-purple-500" />
            <span className="text-sm">
              Shared by <span className="font-semibold text-gray-900">{sharedEvent.sharedByUserName}</span>
            </span>
          </div>

          <div className="flex items-center text-gray-600">
            <Calendar className="mr-2 h-4 w-4 text-purple-500" />
            <span className="text-sm">
              Shared on {new Date(sharedEvent.sharedAt).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center text-gray-600 bg-purple-50 px-3 py-2 rounded-lg">
            <Share2 className="mr-2 h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">
              Permission: {sharedEvent.permissionLevel}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const EventCard: React.FC<{ event: EventResponse; activeTab: "organizing" | "participating" | "shared" }> = ({ event, activeTab }) => {
    const isTooSoon = isEventScheduledTooSoon(event);
    
    return (
      <motion.div
        onClick={() => navigate(`/user/events/${event.eventId}`)}
        className={`group bg-white border-2 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer relative h-full flex flex-col ${
          isTooSoon 
            ? "border-orange-300 hover:border-orange-400" 
            : "border-gray-200 hover:border-blue-400"
        }`}
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Warning overlay for events scheduled too soon */}
        {isTooSoon && (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 to-red-50/30 opacity-100 transition-opacity duration-300 z-10 pointer-events-none" />
        )}
        
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none" />
        
        {/* Event Avatar/Cover Image - Fit hoàn toàn với card, không viền */}
        {event.eventImageUrl && event.eventImageUrl.trim() !== '' ? (
          <div className="w-full aspect-video bg-gradient-to-br from-blue-500 to-purple-600 relative overflow-hidden">
            <img
              src={event.eventImageUrl}
              alt={event.title}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-blue-500 to-purple-600 relative overflow-hidden flex items-center justify-center">
            <Calendar className="h-16 w-16 text-white/50" />
          </div>
        )}

        {/* Content section với padding */}
        <div className="relative p-6 flex-1 flex flex-col">

          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-gray-900 flex-1 group-hover:text-blue-600 transition-colors">
              {event.title}
            </h3>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${getStatusColor(event.status)}`}
              >
                {EVENT_STATE_ICONS[event.status]} {EVENT_STATE_LABELS[event.status]}
              </span>
              {isTooSoon && (
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm bg-orange-100 text-orange-800 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Less than {MIN_ADVANCE_DAYS} days</span>
                </span>
              )}
            </div>
          </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center text-gray-600">
            <Calendar className={`mr-2 h-4 w-4 ${isTooSoon ? "text-orange-500" : "text-blue-500"}`} />
            <span className={`text-sm ${isTooSoon ? "font-semibold text-orange-700" : ""}`}>
              {formatDate(event.scheduledDate)} at {formatTime(event.scheduledTime, event.timezone)}
            </span>
          </div>
          
          {isTooSoon && (
            <div className="flex items-center text-orange-700 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
              <AlertTriangle className="mr-2 h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">
              Event scheduled less than {MIN_ADVANCE_DAYS} days in advance. May need rescheduling.
            </span>
            </div>
          )}

          <div className="flex items-center text-gray-600">
            <Users className="mr-2 h-4 w-4 text-green-500" />
            <span className="text-sm">
              <span className="font-semibold text-gray-900">{event.acceptedCount}</span>
              /{event.expectedAttendees} accepted
            </span>
          </div>

          {event.finalPlaceName && (
            <div className="flex items-center text-gray-600 bg-green-50 px-3 py-2 rounded-lg">
              <MapPin className="mr-2 h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">{event.finalPlaceName}</span>
            </div>
          )}
        </div>

        {event.description && (
          <p className="text-gray-600 text-sm line-clamp-2 mb-4">{event.description}</p>
        )}

        {activeTab === "organizing" && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Organizer: <span className="font-medium text-gray-700">{event.organizerName}</span>
            </span>
            <Sparkles className="h-4 w-4 text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>
    </motion.div>
    );
  };

  const getDisplayEvents = () => {
    if (activeTab === "organizing") return myEvents;
    if (activeTab === "participating") return participatingEvents;
    return [];
  };

  const filteredAndSearchedEvents = useMemo(() => {
    let events = getDisplayEvents();

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      events = events.filter((event) => {
        const titleMatch = event.title?.toLowerCase().includes(query);
        const descriptionMatch = event.description?.toLowerCase().includes(query);
        const placeMatch = event.finalPlaceName?.toLowerCase().includes(query);
        return titleMatch || descriptionMatch || placeMatch;
      });
    }

    if (statusFilter !== "all") {
      events = events.filter((event) => event.status === statusFilter);
    }

    return events;
  }, [myEvents, participatingEvents, activeTab, searchQuery, statusFilter]);

  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAndSearchedEvents.slice(startIndex, endIndex);
  }, [filteredAndSearchedEvents, currentPage]);

  const totalPages = Math.ceil(filteredAndSearchedEvents.length / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getStatusOptions = () => {
    const allStatuses = Object.values(EVENT_STATES);
    return [
      { value: "all", label: "All Statuses" },
      ...allStatuses.map((status) => ({
        value: status,
        label: `${EVENT_STATE_ICONS[status]} ${EVENT_STATE_LABELS[status]}`,
      })),
    ];
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl"
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <Sparkles className="mr-3 h-8 w-8 animate-pulse" />
                My Events
              </h1>
              <p className="text-blue-100">Organize team gatherings with AI-powered venue recommendations</p>
            </motion.div>
            <motion.button
              onClick={() => navigate("/user/events/recurring")}
              className="px-6 py-3 bg-white text-purple-600 rounded-xl hover:bg-purple-50 transition-all duration-200 shadow-lg font-semibold flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Repeat className="h-5 w-5" />
              <span>Recurring</span>
            </motion.button>
            <motion.button
              onClick={() => navigate("/user/events/templates")}
              className="px-6 py-3 bg-white text-green-600 rounded-xl hover:bg-green-50 transition-all duration-200 shadow-lg font-semibold flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <FileText className="h-5 w-5" />
              <span>Templates</span>
            </motion.button>
            <motion.button
              onClick={() => navigate("/user/events/create")}
              className="px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-lg font-semibold flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Plus className="h-5 w-5" />
              <span>Create Event</span>
            </motion.button>
            <motion.button
              onClick={() => navigate("/user/events/branch-summary")}
              className="px-6 py-3 bg-white text-orange-600 rounded-xl hover:bg-orange-50 transition-all duration-200 shadow-lg font-semibold flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              <Building2 className="h-5 w-5" />
              <span>Branch Events</span>
            </motion.button>
          </div>
        </div>
        
        {/* Decorative elements */}
        <motion.div
          className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        ></motion.div>
        <motion.div
          className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"
          animate={{ scale: [1, 1.2, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        ></motion.div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="bg-white rounded-xl shadow-sm p-2 inline-flex space-x-2">
          <motion.button
            onClick={() => setActiveTab("organizing")}
            className={`px-6 py-3 font-semibold rounded-lg transition-all duration-200 ${
              activeTab === "organizing"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Organizing ({myEvents.length})
          </motion.button>
          <motion.button
            onClick={() => setActiveTab("participating")}
            className={`px-6 py-3 font-semibold rounded-lg transition-all duration-200 ${
              activeTab === "participating"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Participating ({participatingEvents.length})
          </motion.button>
          <motion.button
            onClick={() => setActiveTab("shared")}
            className={`px-6 py-3 font-semibold rounded-lg transition-all duration-200 ${
              activeTab === "shared"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Share2 className="h-4 w-4 inline mr-2" />
            Shared with Me ({sharedEvents.length})
          </motion.button>
        </div>
      </motion.div>

      {/* Search and Filter Bar */}
      {activeTab !== "shared" && (
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search events by title, description, or place..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[200px]"
              >
                {getStatusOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(searchQuery || statusFilter !== "all") && (
            <div className="mt-2 text-sm text-gray-600">
              Showing {filteredAndSearchedEvents.length} of {getDisplayEvents().length} events
            </div>
          )}
        </motion.div>
      )}

      {/* Events Grid */}
      {activeTab === "shared" ? (
        sharedEvents.length === 0 ? (
          <motion.div
            className="text-center py-12 bg-white rounded-2xl shadow-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="text-6xl mb-4"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            >
              📤
            </motion.div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              No shared events yet
            </h2>
            <p className="text-gray-500">
              Events shared with you will appear here.
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {sharedEvents.map((sharedEvent, index) => (
              <motion.div
                key={sharedEvent.shareId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
              >
                <SharedEventCard sharedEvent={sharedEvent} />
              </motion.div>
            ))}
          </motion.div>
        )
      ) : filteredAndSearchedEvents.length === 0 ? (
        <motion.div
          className="text-center py-12 bg-white rounded-2xl shadow-lg"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="text-6xl mb-4"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          >
            📅
          </motion.div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            {searchQuery || statusFilter !== "all" ? "No events found" : "No events yet"}
          </h2>
          <p className="text-gray-500 mb-6">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your search or filter criteria."
              : activeTab === "organizing"
              ? "Create your first group event to get started!"
              : "You haven't been invited to any events yet."}
          </p>
          {activeTab === "organizing" && !searchQuery && statusFilter === "all" && (
            <motion.button
              onClick={() => navigate("/user/events/create")}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Create Your First Event
            </motion.button>
          )}
          {(searchQuery || statusFilter !== "all") && (
            <motion.button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors mt-4"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Clear Filters
            </motion.button>
          )}
        </motion.div>
      ) : (
        <>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {paginatedEvents.map((event, index) => (
              <motion.div
                key={event.eventId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
              >
                <EventCard event={event} activeTab={activeTab} />
              </motion.div>
            ))}
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div
              className="mt-8 flex justify-center items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  currentPage === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-blue-50 border border-gray-300 hover:border-blue-500"
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          currentPage === page
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                            : "bg-white text-gray-700 hover:bg-blue-50 border border-gray-300 hover:border-blue-500"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-2 text-gray-400">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  currentPage === totalPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-blue-50 border border-gray-300 hover:border-blue-500"
                }`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <span className="ml-4 text-sm text-gray-600">
                Page {currentPage} of {totalPages} ({filteredAndSearchedEvents.length} events)
              </span>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default EventListPage;

