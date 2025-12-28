// src/components/FloatingChat/FloatingChatWidget.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { ChatContainer } from '../../pages/Chat/ChatContainer';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

export const FloatingChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnreadNotification, setHasUnreadNotification] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Only show chatbox on home page
  const isHomePage = location.pathname === '/';

  // Handle ESC key to close chat
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Clear notification when chat is opened
  useEffect(() => {
    if (isOpen) {
      setHasUnreadNotification(false);
    }
  }, [isOpen]);

  const handleLocationClick = (placeId: string) => {
    if (!placeId || placeId === 'null' || placeId === 'undefined') {
      return;
    }
    navigate(`/place/${placeId}`);
  };

  const handleMapAction = (action: string, data: any) => {
    if (action === 'open_map') {
      navigate('/map', { state: { placeIds: data.placeIds } });
    } else if (action === 'get_directions') {
      const { latitude, longitude } = data;
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
        '_blank'
      );
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // Don't render if not on home page
  if (!isHomePage) {
    return null;
  }

  return (
    <>
      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#374151',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            borderRadius: '12px',
            padding: '12px 16px',
          },
        }}
      />

      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div className="fixed bottom-6 right-6 z-[9999] group/tooltip">
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleChat}
              className="w-16 h-16 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:shadow-purple-500/50 transition-shadow duration-300 group relative"
              aria-label="Open chat with BEESRS AI"
            >
              <SparklesIcon className="w-8 h-8 group-hover:scale-110 transition-transform" />
            
            {/* Notification Badge */}
            {hasUnreadNotification && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
              >
                <span className="text-white">1</span>
              </motion.div>
            )}

            {/* Pulse Effect */}
            {hasUnreadNotification && (
              <span className="absolute inset-0 rounded-full bg-blue-400 opacity-75 animate-ping" />
            )}
          </motion.button>

          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
              Chat with BEESRS AI
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rotate-45 w-2 h-2 bg-gray-900" />
            </div>
          </div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998] md:hidden"
            />

            {/* Chat Box */}
            <motion.div
              initial={{ 
                opacity: 0, 
                scale: 0.9,
                y: 20
              }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                y: 0
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.9,
                y: 20
              }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed z-[9999] bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 shadow-2xl overflow-hidden flex flex-col
                h-[100vh] md:h-[550px]
                bottom-0 right-0 md:bottom-6 md:right-6 
                w-full md:w-[430px] md:max-w-[calc(100vw-3rem)]
                md:rounded-2xl rounded-t-2xl md:rounded-t-2xl
                border border-white/50 backdrop-blur-sm
              "
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 px-4 py-3 flex items-center justify-between text-white relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-12 translate-x-12"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-10 -translate-x-10"></div>
                
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">BEESRS AI Assistant</h3>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 relative z-10">
                  {/* Close Button */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-all duration-200 hover:scale-105"
                    title="Close"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Content */}
              <div className="flex-1 overflow-hidden min-w-0">
                <ChatContainer
                  onLocationClick={handleLocationClick}
                  onMapAction={handleMapAction}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

