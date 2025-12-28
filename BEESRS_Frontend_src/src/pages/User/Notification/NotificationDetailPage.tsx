import type { NotificationDetailDto } from "@/types/notifications.types";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Bell, 
  Calendar, 
  Users, 
  MapPin, 
  AlertCircle, 
  Info,
  ExternalLink,
  ArrowLeft,
  CheckCircle,
  Clock,
  Calendar as CalendarIcon,
  Copy,
  CheckCircle2
} from "lucide-react";
import notificationService from "@/services/notificationService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Enhanced notification style helper
const getNotificationStyle = (notificationType: string | undefined, isRead: boolean) => {
  const baseStyle = {
    icon: Bell,
    iconColor: "text-white",
    iconBg: isRead 
      ? "bg-gradient-to-br from-slate-400 to-slate-500" 
      : "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700",
    borderColor: isRead ? "border-slate-200" : "border-blue-300",
    accentGradient: isRead 
      ? "from-slate-50 to-slate-100" 
      : "from-blue-50 via-indigo-50 to-purple-50",
    headerGradient: isRead
      ? "bg-gradient-to-r from-slate-100 to-slate-200"
      : "bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100",
    textColor: isRead ? "text-slate-600" : "text-slate-900",
    titleColor: isRead ? "text-slate-700" : "text-slate-900",
  };

  switch (notificationType) {
    case "EventInvitation":
    case "EventJoinRequest":
      return {
        ...baseStyle,
        icon: Calendar,
        iconBg: isRead 
          ? "bg-gradient-to-br from-blue-300 to-blue-400" 
          : "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700",
        accentGradient: isRead 
          ? "from-blue-50 to-blue-100" 
          : "from-blue-50 via-indigo-50 to-purple-50",
        headerGradient: isRead
          ? "bg-gradient-to-r from-blue-100 to-blue-200"
          : "bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100",
      };
    case "ItineraryCreated":
    case "ItineraryShare":
    case "RevokeItineraryShare":
      return {
        ...baseStyle,
        icon: MapPin,
        iconBg: isRead 
          ? "bg-gradient-to-br from-emerald-300 to-emerald-400" 
          : "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700",
        accentGradient: isRead 
          ? "from-emerald-50 to-emerald-100" 
          : "from-emerald-50 via-teal-50 to-cyan-50",
        headerGradient: isRead
          ? "bg-gradient-to-r from-emerald-100 to-emerald-200"
          : "bg-gradient-to-r from-emerald-100 via-teal-100 to-cyan-100",
      };
    case "Place":
      return {
        ...baseStyle,
        icon: MapPin,
        iconBg: isRead 
          ? "bg-gradient-to-br from-orange-300 to-orange-400" 
          : "bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700",
        accentGradient: isRead 
          ? "from-orange-50 to-orange-100" 
          : "from-orange-50 via-amber-50 to-yellow-50",
        headerGradient: isRead
          ? "bg-gradient-to-r from-orange-100 to-orange-200"
          : "bg-gradient-to-r from-orange-100 via-amber-100 to-yellow-100",
      };
    case "SystemAlert":
      return {
        ...baseStyle,
        icon: AlertCircle,
        iconBg: isRead 
          ? "bg-gradient-to-br from-amber-300 to-amber-400" 
          : "bg-gradient-to-br from-amber-500 via-orange-500 to-red-600",
        accentGradient: isRead 
          ? "from-amber-50 to-amber-100" 
          : "from-amber-50 via-orange-50 to-red-50",
        headerGradient: isRead
          ? "bg-gradient-to-r from-amber-100 to-amber-200"
          : "bg-gradient-to-r from-amber-100 via-orange-100 to-red-100",
      };
    case "Friendship":
    case "FriendRequest":
      return {
        ...baseStyle,
        icon: Users,
        iconBg: isRead 
          ? "bg-gradient-to-br from-purple-300 to-purple-400" 
          : "bg-gradient-to-br from-purple-500 via-purple-600 to-pink-700",
        accentGradient: isRead 
          ? "from-purple-50 to-purple-100" 
          : "from-purple-50 via-pink-50 to-rose-50",
        headerGradient: isRead
          ? "bg-gradient-to-r from-purple-100 to-purple-200"
          : "bg-gradient-to-r from-purple-100 via-pink-100 to-rose-100",
      };
    default:
      return {
        ...baseStyle,
        icon: Info,
      };
  }
};

export default function NotificationDetailPage() {
  const { notificationId } = useParams<{ notificationId: string }>();
  const [searchParams] = useSearchParams();
  const urlNotificationId = searchParams.get("notificationId");
  const actualNotificationId = notificationId || urlNotificationId;
  
  const [notification, setNotification] = useState<NotificationDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  // Fetch notification detail by ID
  useEffect(() => {
    const fetchNotificationDetail = async () => {
      try {
        if (!actualNotificationId) {
          setError("No notification ID provided.");
          setLoading(false);
          return;
        }

        const detail = await notificationService.getNotificationDetailById(actualNotificationId);
        setNotification(detail);
        
        // Auto mark as read when viewing detail
        if (detail && !detail.isRead) {
          await notificationService.markAsRead(actualNotificationId);
          setNotification(prev => prev ? { ...prev, isRead: true, readAt: new Date().toISOString() } : null);
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to load notification detail.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotificationDetail();
  }, [actualNotificationId]);

  const handleBack = () => {
    navigate("/notification");
  };

  const handleRelatedContentClick = () => {
    if (!notification?.deepLinkUrl) return;
    
    // Fix old event paths: /events/{id} -> /user/events/{id}
    let fixedUrl = notification.deepLinkUrl;
    if (fixedUrl.startsWith('/events/') && !fixedUrl.startsWith('/user/events/')) {
      fixedUrl = fixedUrl.replace('/events/', '/user/events/');
    }
    
    navigate(fixedUrl);
  };

  const handleCopyMessage = async () => {
    if (!notification?.message) return;
    
    try {
      await navigator.clipboard.writeText(notification.message);
      setCopied(true);
      toast.success("Message copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy message");
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-blue-600"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-blue-600 opacity-20"></div>
          </div>
          <p className="text-slate-600 font-medium">Loading notification details...</p>
        </div>
      </div>
    );
  }

  if (error || !notification) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center shadow-lg">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {error || "Notification not found"}
          </h2>
          <p className="text-slate-500 mb-8 text-sm">
            The notification you're looking for doesn't exist or has been deleted.
          </p>
          <Button
            onClick={handleBack}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30"
          >
            Back to Notifications
          </Button>
        </div>
      </div>
    );
  }

  const style = getNotificationStyle(notification.notificationType, notification.isRead);
  const IconComponent = style.icon;

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header - Enhanced */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10 shadow-sm"
        >
          <div className="px-6 lg:px-8 py-5">
            <Button
              onClick={handleBack}
              variant="ghost"
              className="mb-5 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Notifications</span>
            </Button>
            
            <div className="flex items-center gap-4 flex-wrap">
              <div className={`flex-shrink-0 w-14 h-14 rounded-2xl ${style.iconBg} flex items-center justify-center shadow-lg`}>
                <IconComponent className={`w-7 h-7 ${style.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className={`text-2xl lg:text-3xl font-bold ${style.titleColor} mb-1`}>
                  {notification.title || "Notification"}
                </h1>
                {notification.notificationType && (
                  <Badge variant="secondary" className={`mt-2 ${
                    notification.isRead 
                      ? "bg-slate-100 text-slate-600" 
                      : "bg-blue-100 text-blue-700"
                  } border-0 font-semibold`}>
                    {notification.notificationType}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content - Enhanced */}
        <div className="p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Message Section - Enhanced */}
            <div className="flex-1 space-y-6">
              {notification.message ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden"
                >
                  {/* Message Header - Enhanced */}
                  <div className={`bg-gradient-to-r ${style.headerGradient} px-8 py-6 border-b border-slate-200/50`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl ${style.iconBg} flex items-center justify-center shadow-md`}>
                          <IconComponent className={`w-7 h-7 ${style.iconColor}`} />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900">Message</h2>
                          <p className="text-sm text-slate-600 mt-0.5 font-medium">Notification details</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyMessage}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        {copied ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Message Content - Enhanced */}
                  <div className="px-8 py-10">
                    <p className="text-lg text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                      {notification.message}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-12 text-center">
                  <Info className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-500 font-medium">No message content available</p>
                </div>
              )}

              {/* Related Content Button - Enhanced */}
              {notification.deepLinkUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl overflow-hidden group"
                >
                  <button
                    onClick={handleRelatedContentClick}
                    className="w-full px-8 py-6 flex items-center justify-between text-white hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <ExternalLink className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-lg mb-1">View Related Content</div>
                        <div className="text-sm text-blue-100 font-medium">Click to open related page</div>
                      </div>
                    </div>
                    <ExternalLink className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              )}
            </div>

            {/* Sidebar - Enhanced */}
            <div className="lg:w-80 flex-shrink-0">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6 space-y-6 sticky top-24"
              >
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Details
                </h3>
                
                {/* Status - Enhanced */}
                <div className="pb-5 border-b border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Status</div>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
                    notification.isRead 
                      ? "bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200" 
                      : "bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border border-amber-200"
                  }`}>
                    {notification.isRead ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Read
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        Unread
                      </>
                    )}
                  </div>
                </div>

                {/* Timestamps - Enhanced */}
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                      <Clock className="w-4 h-4" />
                      <span>Created</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">
                      {new Date(notification.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>
                  </div>

                  {notification.readAt && (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                        <CheckCircle className="w-4 h-4" />
                        <span>Read</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">
                        {new Date(notification.readAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </div>
                    </div>
                  )}

                  {notification.expiresAt && (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                        <CalendarIcon className="w-4 h-4" />
                        <span>Expires</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">
                        {new Date(notification.expiresAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Type - Enhanced */}
                {notification.actionType && (
                  <div className="pt-5 border-t border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Action Type</div>
                    <div className="text-sm font-semibold text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                      {notification.actionType}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
