import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, Info, X } from "lucide-react";
import { Button } from "./button";

export type NotificationType = "success" | "error" | "warning" | "info";

interface BeautifulNotificationProps {
  type: NotificationType;
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

export default function BeautifulNotification({
  type,
  title,
  description,
  isOpen,
  onClose,
  duration = 5000,
}: BeautifulNotificationProps) {
  // Auto close after duration
  React.useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="h-6 w-6 text-green-500" />,
    error: <XCircle className="h-6 w-6 text-red-500" />,
    warning: <AlertCircle className="h-6 w-6 text-yellow-500" />,
    info: <Info className="h-6 w-6 text-blue-500" />,
  };

  const colors = {
    success: "bg-green-50 border-green-200 text-green-900",
    error: "bg-red-50 border-red-200 text-red-900",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
    info: "bg-blue-50 border-blue-200 text-blue-900",
  };

  const iconBgColors = {
    success: "bg-green-100",
    error: "bg-red-100",
    warning: "bg-yellow-100",
    info: "bg-blue-100",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-[9998]"
          />
          
          {/* Notification Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className={`fixed top-4 right-4 z-[9999] max-w-md w-full ${colors[type]} border-2 rounded-xl shadow-2xl overflow-hidden`}
          >
            <div className="p-4 flex items-start gap-4">
              {/* Icon */}
              <div className={`flex-shrink-0 ${iconBgColors[type]} rounded-full p-2`}>
                {icons[type]}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base mb-1">{title}</h3>
                {description && (
                  <p className="text-sm opacity-90 leading-relaxed">{description}</p>
                )}
              </div>
              
              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="flex-shrink-0 h-6 w-6 p-0 hover:bg-black/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Progress Bar */}
            {duration > 0 && (
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: duration / 1000, ease: "linear" }}
                className={`h-1 ${
                  type === "success" ? "bg-green-500" :
                  type === "error" ? "bg-red-500" :
                  type === "warning" ? "bg-yellow-500" :
                  "bg-blue-500"
                }`}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook for using BeautifulNotification
import { useState, useCallback } from "react";

export function useBeautifulNotification() {
  const [notification, setNotification] = useState<{
    type: NotificationType;
    title: string;
    description?: string;
    isOpen: boolean;
  }>({
    type: "info",
    title: "",
    isOpen: false,
  });

  const showNotification = useCallback((
    type: NotificationType,
    title: string,
    description?: string
  ) => {
    setNotification({ type, title, description, isOpen: true });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    notification,
    showNotification,
    hideNotification,
    NotificationComponent: (
      <BeautifulNotification
        type={notification.type}
        title={notification.title}
        description={notification.description}
        isOpen={notification.isOpen}
        onClose={hideNotification}
      />
    ),
  };
}

