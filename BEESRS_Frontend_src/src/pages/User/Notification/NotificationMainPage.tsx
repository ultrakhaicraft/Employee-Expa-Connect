import type { NotificationViewDto, NotificationDetailDto, SearchParams } from "@/types/notifications.types";
import notificationService from "@/services/notificationService";
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  Calendar, 
  Users, 
  MapPin, 
  AlertCircle, 
  Info,
  CheckCircle2,
  Clock,
  Search,
  MoreVertical,
  CheckCheck,
  Trash2,
  AlertTriangle
} from "lucide-react";
import NotificationDetailPage from "./NotificationDetailPage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Helper function to format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
  });
};

// Enhanced notification style helper
const getNotificationStyle = (notificationType: string | undefined, isRead: boolean) => {
  const baseStyle = {
    icon: Bell,
    iconColor: isRead ? "text-slate-400" : "text-white",
    iconBg: isRead 
      ? "bg-gradient-to-br from-slate-100 to-slate-200" 
      : "bg-gradient-to-br from-blue-500 to-blue-600",
    accentColor: isRead ? "border-slate-200" : "border-blue-500",
    bgColor: isRead ? "bg-white" : "bg-gradient-to-br from-white to-blue-50/30",
    titleColor: isRead ? "text-slate-700" : "text-slate-900",
    textColor: isRead ? "text-slate-500" : "text-slate-600",
    badgeColor: isRead ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700",
  };

  switch (notificationType) {
    case "EventInvitation":
    case "EventJoinRequest":
      return {
        ...baseStyle,
        icon: Calendar,
        iconBg: isRead 
          ? "bg-gradient-to-br from-blue-50 to-blue-100" 
          : "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600",
        iconColor: isRead ? "text-blue-500" : "text-white",
        accentColor: isRead ? "border-blue-200" : "border-blue-500",
        bgColor: isRead ? "bg-white" : "bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/30",
        badgeColor: isRead ? "bg-blue-50 text-blue-600" : "bg-blue-100 text-blue-700",
      };
    case "ItineraryCreated":
    case "ItineraryUpdated":
    case "ItineraryDeleted":
    case "ItineraryImageAdded":
    case "ItineraryShare":
    case "RevokeItineraryShare":
      return {
        ...baseStyle,
        icon: MapPin,
        iconBg: isRead 
          ? "bg-gradient-to-br from-emerald-50 to-emerald-100" 
          : "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600",
        iconColor: isRead ? "text-emerald-500" : "text-white",
        accentColor: isRead ? "border-emerald-200" : "border-emerald-500",
        bgColor: isRead ? "bg-white" : "bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/30",
        badgeColor: isRead ? "bg-emerald-50 text-emerald-600" : "bg-emerald-100 text-emerald-700",
      };
    case "Place":
      return {
        ...baseStyle,
        icon: MapPin,
        iconBg: isRead 
          ? "bg-gradient-to-br from-orange-50 to-orange-100" 
          : "bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600",
        iconColor: isRead ? "text-orange-500" : "text-white",
        accentColor: isRead ? "border-orange-200" : "border-orange-500",
        bgColor: isRead ? "bg-white" : "bg-gradient-to-br from-white via-orange-50/40 to-amber-50/30",
        badgeColor: isRead ? "bg-orange-50 text-orange-600" : "bg-orange-100 text-orange-700",
      };
    case "SystemAlert":
      return {
        ...baseStyle,
        icon: AlertCircle,
        iconBg: isRead 
          ? "bg-gradient-to-br from-amber-50 to-amber-100" 
          : "bg-gradient-to-br from-amber-500 via-orange-500 to-red-500",
        iconColor: isRead ? "text-amber-500" : "text-white",
        accentColor: isRead ? "border-amber-200" : "border-amber-500",
        bgColor: isRead ? "bg-white" : "bg-gradient-to-br from-white via-amber-50/40 to-orange-50/30",
        badgeColor: isRead ? "bg-amber-50 text-amber-600" : "bg-amber-100 text-amber-700",
      };
    case "Friendship":
    case "FriendRequest":
      return {
        ...baseStyle,
        icon: Users,
        iconBg: isRead 
          ? "bg-gradient-to-br from-purple-50 to-purple-100" 
          : "bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600",
        iconColor: isRead ? "text-purple-500" : "text-white",
        accentColor: isRead ? "border-purple-200" : "border-purple-500",
        bgColor: isRead ? "bg-white" : "bg-gradient-to-br from-white via-purple-50/40 to-pink-50/30",
        badgeColor: isRead ? "bg-purple-50 text-purple-600" : "bg-purple-100 text-purple-700",
      };
    default:
      return {
        ...baseStyle,
        icon: Info,
        iconBg: isRead 
          ? "bg-gradient-to-br from-slate-50 to-slate-100" 
          : "bg-gradient-to-br from-slate-400 to-slate-500",
        iconColor: isRead ? "text-slate-400" : "text-white",
      };
  }
};

type FilterType = "all" | "unread" | "read";

export default function NotificationMainPage() {
  const [notifications, setNotifications] = useState<NotificationViewDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNotification, setSelectedNotification] = useState<NotificationDetailDto | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedNotificationId = searchParams.get("notificationId");

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (selectedNotificationId) {
      loadNotificationDetail(selectedNotificationId);
    } else {
      setSelectedNotification(null);
    }
  }, [selectedNotificationId]);

  const fetchNotifications = async () => {
    try {
      const params: SearchParams = { page: 1, pageSize: 50 };
      const response = await notificationService.getAllNotification(params);
      setNotifications(response.items || []);
    } catch (error) {
      console.error("❌ Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationDetail = async (notificationId: string) => {
    try {
      setLoadingDetail(true);
      const detail = await notificationService.getNotificationDetailById(notificationId);
      setSelectedNotification(detail);
      
      if (detail && !detail.isRead) {
        await notificationService.markAsRead(notificationId);
        setNotifications(prev => prev.map(n => 
          n.notificationId === notificationId 
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        ));
        setSelectedNotification(prev => prev ? { ...prev, isRead: true, readAt: new Date().toISOString() } : null);
      }
    } catch (error) {
      console.error("Failed to load notification detail:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const GoToDetail = async (notificationId: string) => {
    if (!notificationId) {
      console.warn("Invalid notification ID");
      return;
    }
    navigate(`/notification?notificationId=${notificationId}`);
  };

  const handleMarkAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => prev.map(n => 
        n.notificationId === notificationId 
          ? { ...n, isRead: true, readAt: new Date().toISOString() }
          : n
      ));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleDeleteNotification = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIdToDelete(notificationId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteNotification = async () => {
    if (!idToDelete) return;
    
    const notificationId = idToDelete;
    setShowDeleteConfirm(false);
    
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.notificationId !== notificationId));
      if (selectedNotificationId === notificationId) {
        navigate("/notification");
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    } finally {
      setIdToDelete(null);
    }
  };

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    
    // Apply status filter
    if (filter === "unread") filtered = filtered.filter(n => !n.isRead);
    if (filter === "read") filtered = filtered.filter(n => n.isRead);
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title?.toLowerCase().includes(query) ||
        n.notificationType?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [notifications, filter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.isRead).length;
    const read = total - unread;
    return { total, unread, read };
  }, [notifications]);

  if (loading) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-blue-600"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-blue-600 opacity-20"></div>
          </div>
          <p className="text-slate-600 font-medium">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 min-h-screen flex">
      {/* Left Panel - Notification List */}
      <div className={`flex-1 overflow-hidden flex flex-col ${selectedNotificationId ? 'hidden lg:flex lg:w-2/5' : 'w-full'}`}>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
            {/* Header Section - Enhanced */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <Bell className="h-7 w-7 text-white" />
                    </div>
                    {stats.unread > 0 && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                        <span className="text-xs font-bold text-white">{stats.unread > 9 ? '9+' : stats.unread}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent">
                      Notifications
                    </h1>
                    <p className="text-sm text-slate-500 mt-1.5 font-medium">
                      {stats.total} total • <span className="text-blue-600 font-semibold">{stats.unread} unread</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700 placeholder:text-slate-400 shadow-sm transition-all"
                />
              </div>

              {/* Filter Tabs - Enhanced */}
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl p-1.5 shadow-sm border border-slate-200/50 inline-flex">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    filter === "all"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  All ({stats.total})
                </button>
                <button
                  onClick={() => setFilter("unread")}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 relative ${
                    filter === "unread"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  Unread
                  {stats.unread > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                      {stats.unread}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setFilter("read")}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    filter === "read"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  Read ({stats.read})
                </button>
              </div>
            </div>
            
            {/* Notifications List - Enhanced */}
            {filteredNotifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <Bell className="h-10 w-10 text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-700 mb-2">
                  {searchQuery ? "No results found" : filter === "unread" ? "All caught up!" : filter === "read" ? "No read notifications" : "No notifications yet"}
                </h2>
                <p className="text-slate-500 max-w-sm mx-auto">
                  {searchQuery 
                    ? "Try adjusting your search terms."
                    : filter === "all" 
                    ? "You'll see notifications here when you receive them."
                    : filter === "unread"
                    ? "You're all caught up! No unread notifications."
                    : "No read notifications to display."}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredNotifications.map((n, index) => {
                    const style = getNotificationStyle(n.notificationType, n.isRead);
                    const IconComponent = style.icon;
                    
                    return (
                      <motion.div
                        key={n.notificationId}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ delay: index * 0.02, duration: 0.2 }}
                        onClick={() => GoToDetail(n.notificationId)}
                        className={`group relative ${style.bgColor} rounded-xl border-l-4 cursor-pointer transition-all duration-300 overflow-hidden ${
                          selectedNotificationId === n.notificationId
                            ? `${style.accentColor} shadow-xl ring-2 ring-blue-500/30 scale-[1.02]`
                            : `${style.accentColor} hover:shadow-lg hover:scale-[1.01] hover:border-opacity-100`
                        } ${!n.isRead ? 'shadow-md' : 'shadow-sm border-opacity-50'}`}
                      >
                        {/* Unread indicator line */}
                        {!n.isRead && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                        )}
                        
                        <div className="p-5">
                          <div className="flex items-start gap-4">
                            {/* Icon - Enhanced */}
                            <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${style.iconBg} flex items-center justify-center shadow-md transition-transform group-hover:scale-110`}>
                              <IconComponent className={`w-6 h-6 ${style.iconColor}`} />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <h3 className={`font-bold text-base leading-tight ${style.titleColor} line-clamp-2 flex-1 min-w-0`}>
                                  {n.title || "Notification"}
                                </h3>
                                <div className="flex-shrink-0 relative z-10">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 rounded-lg"
                                        aria-label="More options"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="z-[100] min-w-[180px]">
                                      {!n.isRead && (
                                        <DropdownMenuItem 
                                          onClick={(e) => handleMarkAsRead(n.notificationId, e)}
                                          className="cursor-pointer"
                                        >
                                          <CheckCheck className="mr-2 h-4 w-4 text-blue-600" />
                                          <span>Mark as read</span>
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem 
                                        onClick={(e) => handleDeleteNotification(n.notificationId, e)}
                                        className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete notification</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              
                              {/* Meta Information - Enhanced */}
                              <div className="flex items-center gap-3 flex-wrap mt-3">
                                {n.notificationType && (
                                  <Badge variant="secondary" className={`text-xs font-semibold ${style.badgeColor} border-0`}>
                                    {n.notificationType}
                                  </Badge>
                                )}
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{formatRelativeTime(n.createdAt)}</span>
                                </div>
                                {n.isRead && (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Read</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Unread dot */}
                            {!n.isRead && (
                              <div className="flex-shrink-0 w-2.5 h-2.5 bg-blue-600 rounded-full mt-1.5 animate-pulse"></div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Notification Detail */}
      {selectedNotificationId && (
        <>
          {loadingDetail ? (
            <div className="hidden lg:flex lg:w-3/5 items-center justify-center bg-white/80 backdrop-blur-sm border-l border-slate-200">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-blue-600"></div>
                  <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-blue-600 opacity-20"></div>
                </div>
                <p className="text-slate-600 font-medium">Loading notification details...</p>
              </div>
            </div>
          ) : selectedNotification ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-white to-slate-50/50 border-l border-slate-200 overflow-y-auto"
            >
              <div className="w-full">
                <NotificationDetailPage />
              </div>
            </motion.div>
          ) : (
            <div className="hidden lg:flex lg:w-3/5 items-center justify-center bg-white/80 backdrop-blur-sm border-l border-slate-200">
              <div className="text-center max-w-md px-6">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center shadow-lg">
                  <AlertCircle className="h-10 w-10 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-700 mb-2">Notification not found</h3>
                <p className="text-slate-500 mb-8">The notification you're looking for doesn't exist or has been deleted.</p>
                <Button
                  onClick={() => navigate("/notification")}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30"
                >
                  Back to List
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="z-[10000] w-[90%] max-w-[400px] rounded-2xl p-6">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold text-gray-900">
              Delete Notification?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-gray-500 text-base">
              Are you sure you want to delete this notification? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <AlertDialogCancel className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl py-3 font-semibold transition-all active:scale-95 m-0 order-2 sm:order-1">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteNotification}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 font-semibold transition-all active:scale-95 m-0 order-1 sm:order-2"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
