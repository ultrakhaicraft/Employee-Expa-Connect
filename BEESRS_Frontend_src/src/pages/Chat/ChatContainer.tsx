// src/components/Chat/ChatContainer.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '../../lib/hooks/useChat';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { ChatTypingIndicator } from './ChatTypingIndicator';
import { ConversationHistory } from './ConversationHistory';
import type { UserLocation } from '../../types/chat.types';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../redux/store';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldAlert, Menu, X } from 'lucide-react';
import { setCurrentConversation, clearMessages } from '../../redux/chatSlice';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface ChatContainerProps {
  conversationId?: string;
  onLocationClick?: (placeId: string) => void;
  onMapAction?: (action: string, data: any) => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  conversationId: initialConversationId,
  onLocationClick,
  onMapAction,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // ✅ Check authentication
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const currentConversationId = useSelector((state: RootState) => state.chat.currentConversationId);
  
  // Use conversation ID from Redux or initial prop
  const activeConversationId = currentConversationId || initialConversationId;
  
  const { messages, suggestedActions, sendMessage, isTyping, isConnected, isLoading } =
    useChat(activeConversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (text: string, location?: UserLocation) => {
    await sendMessage(text, location);
  };

  const handleMediaSelect = async (media: any) => {
    if (media.type === 'location') {
      // For location, send as location message
      await sendMessage('📍 Location', undefined, {
        messageType: 'location',
        location: {
          latitude: media.latitude,
          longitude: media.longitude,
          address: media.locationName
        },
        locationName: media.locationName
      });
    } else {
      // For other media types, send as media message
      const mediaContent = media.type === 'image' ? '📷 Photo' : '🎥 Video';
      await sendMessage(mediaContent, undefined, {
        messageType: media.type,
        mediaUrl: media.url,
        mediaThumbnailUrl: media.thumbnailUrl,
        mediaFileName: media.fileName,
        mediaFileSize: media.fileSize,
        mediaMimeType: media.mimeType,
        mediaDuration: media.duration
      });
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    await sendMessage(suggestion);
  };

  // Helper function to get current location with GPS
  const getCurrentLocationGPS = (): Promise<UserLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = 'Unable to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // Cache location for 5 minutes
        }
      );
    });
  };

  // Fallback: Get location from IP
  const getLocationFromIP = async (): Promise<UserLocation> => {
    // Try multiple IP geolocation providers as fallback
    const providers = [
      // Provider 1: ip-api.com (free, reliable)
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
          const response = await fetch('https://ip-api.com/json/?fields=status,lat,lon', {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (!response.ok) throw new Error('Response not OK');
          const data = await response.json();
          if (data.status === 'success' && data.lat && data.lon) {
            return { latitude: data.lat, longitude: data.lon };
          }
          throw new Error('Invalid response');
        } catch (e) {
          clearTimeout(timeoutId);
          throw e;
        }
      },
      
      // Provider 2: geojs.io (free, simple)
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
          const response = await fetch('https://get.geojs.io/v1/ip/geo.json', {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (!response.ok) throw new Error('Response not OK');
          const data = await response.json();
          if (data.latitude && data.longitude) {
            return { 
              latitude: parseFloat(data.latitude), 
              longitude: parseFloat(data.longitude) 
            };
          }
          throw new Error('Invalid response');
        } catch (e) {
          clearTimeout(timeoutId);
          throw e;
        }
      },
      
      // Provider 3: ipwhois.app (free)
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
          const response = await fetch('https://ipwhois.app/json/', {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (!response.ok) throw new Error('Response not OK');
          const data = await response.json();
          if (data.latitude && data.longitude) {
            return { 
              latitude: parseFloat(data.latitude), 
              longitude: parseFloat(data.longitude) 
            };
          }
          throw new Error('Invalid response');
        } catch (e) {
          clearTimeout(timeoutId);
          throw e;
        }
      },
    ];

    // Try each provider in sequence
    for (const provider of providers) {
      try {
        const location = await provider();
        if (location) {
          return location;
        }
      } catch (e) {
        continue; // Try next provider
      }
    }
    
    throw new Error('Unable to get location from IP services');
  };

  const handleActionClick = async (action: any) => {
    // Handle enable_location - automatically get location and resend the last message
    if (action.type === 'enable_location') {
      let location: UserLocation | null = null;
      
      // Try GPS first
      try {
        location = await getCurrentLocationGPS();
        toast.success('Location enabled successfully! 📍', {
          duration: 2000,
        });
      } catch (gpsError: any) {
        
        // Fallback to IP-based location
        try {
          location = await getLocationFromIP();
          toast.success(
            <div>
              <div className="font-semibold">Location enabled (approximate) 📍</div>
              <div className="text-xs mt-1">Using approximate location based on your IP address</div>
            </div>,
            {
              duration: 3000,
            }
          );
        } catch (ipError: any) {
          
          // Show detailed error with helpful instructions
          const errorMessage = gpsError.message || 'Unable to get location';
          const isPermissionDenied = errorMessage.includes('permission denied') || 
                                     errorMessage.includes('denied');
          
          toast.error(
            <div>
              <div className="font-semibold">Unable to get your location</div>
              <div className="text-xs mt-1 space-y-1">
                <div>{errorMessage}</div>
                {isPermissionDenied && (
                  <div className="mt-2 pt-2 border-t border-red-200">
                    <div className="font-medium">How to enable location:</div>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-[10px]">
                      <li>Click the location icon in the chat input</li>
                      <li>Or allow location access in browser settings</li>
                      <li>Or select a location on the map</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>,
            { duration: 6000 }
          );
          return;
        }
      }
      
      // If we got a location (GPS or IP), send the message
      if (location) {
        // Get the last user message to resend with location
        const lastUserMessage = messages
          .filter(m => m.senderType?.toLowerCase() === 'user')
          .slice(-1)[0];
        
        if (lastUserMessage) {
          // Resend the last message with location
          await sendMessage(lastUserMessage.messageText, location);
        } else {
          // If no previous message, just send a generic message with location
          await sendMessage('Find nearby places', location);
        }
      }
      return;
    }
    
    // Handle specific action types that don't send messages
    if (action.type === 'show_location') {
      onLocationClick?.(action.data?.placeId);
      return;
    }
    
    if (action.type === 'open_map') {
      onMapAction?.('open_map', action.data);
      return;
    }
    
    if (action.type === 'get_directions') {
      onMapAction?.('get_directions', action.data);
      return;
    }
    
    // For quick_reply or any other action with label, send the message
    // Check if action has query in data, otherwise use label
    const messageToSend = action.data?.query || action.label;
    if (messageToSend) {
      await sendMessage(messageToSend);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    dispatch(setCurrentConversation(conversationId));
    setIsSidebarOpen(false); // Close sidebar on mobile
  };

  const handleNewConversation = () => {
    dispatch(setCurrentConversation(null));
    dispatch(clearMessages());
    setIsSidebarOpen(false);
  };

  const handleDeleteConversation = (conversationId: string) => {
    if (conversationId === activeConversationId) {
      handleNewConversation();
    }
  };

  // ✅ If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          {/* Icon */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-blue-500 opacity-20 blur-2xl rounded-full animate-pulse" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-xl">
              <ShieldAlert className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">
            Sign in required
          </h3>

          {/* Message */}
          <p className="text-sm text-gray-600 text-center max-w-xs mb-6 leading-relaxed">
            Please sign in to chat with BEESRS AI and access your conversation history.
          </p>

          {/* Login Button */}
          <button
            onClick={() => navigate('/login')}
            className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            <span>Sign in now</span>
          </button>

          {/* Features List */}
          <div className="mt-8 space-y-3 w-full max-w-xs">
            <p className="text-xs font-semibold text-gray-500 text-center mb-3">
              Benefits after signing in:
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-gray-100">
                <span className="text-green-500 text-sm">✓</span>
                <span className="text-xs text-gray-700">Chat with AI to discover restaurants and places</span>
              </div>
              <div className="flex items-start gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-gray-100">
                <span className="text-green-500 text-sm">✓</span>
                <span className="text-xs text-gray-700">Save your chat history</span>
              </div>
              <div className="flex items-start gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-gray-100">
                <span className="text-green-500 text-sm">✓</span>
                <span className="text-xs text-gray-700">Receive personalized location suggestions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative min-w-0 overflow-hidden">
      {/* Sidebar - Conversation History */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-10 md:hidden"
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="
                absolute md:relative z-20
                w-[280px] md:w-[300px] h-full
                bg-white/80 backdrop-blur-sm border-r border-white/20
                shadow-xl md:shadow-none
              "
            >
              <ConversationHistory
                currentConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onDeleteConversation={handleDeleteConversation}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Header with Menu Toggle */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-white/50 backdrop-blur-sm border-b border-white/20 shrink-0 min-w-0 max-w-full">
          {/* Menu Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-white/30 transition-colors flex-shrink-0"
            title={isSidebarOpen ? "Hide conversation history" : "Show conversation history"}
          >
            {isSidebarOpen ? (
              <X className="w-4 h-4 text-gray-700" />
            ) : (
              <Menu className="w-4 h-4 text-gray-700" />
            )}
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className="font-semibold text-gray-800 text-sm truncate">BEESRS AI Chat</h3>
            <p className="text-xs text-gray-600 truncate">
              {activeConversationId ? 'Conversation' : 'New conversation'}
            </p>
          </div>
        </div>

        {/* Connection Status Bar - Only show if authenticated but disconnected */}
        {isAuthenticated && !isConnected && (
          <div className="bg-amber-50/80 backdrop-blur-sm border-b border-amber-200/50 px-4 py-2">
            <div className="flex items-center gap-2 text-amber-700">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-medium">Reconnecting...</span>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-transparent">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 bg-blue-600 rounded-full opacity-20 animate-ping" />
                </div>
              </div>
              <p className="text-sm text-gray-600 animate-pulse">Loading...</p>
            </div>
          ) : (
            <>
              <ChatMessageList
                messages={messages}
                suggestedActions={suggestedActions}
                onLocationClick={onLocationClick}
                onMapAction={onMapAction}
                onSuggestionClick={handleSuggestionClick}
                onActionClick={handleActionClick}
              />
              {isTyping && <ChatTypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="px-3 py-2.5 bg-white/50 backdrop-blur-sm border-t border-white/20 shrink-0 min-w-0 max-w-full">
            <ChatInput 
              onSendMessage={handleSendMessage} 
              onMediaSelect={handleMediaSelect}
              disabled={!isConnected} 
            />
        </div>
      </div>
    </div>
  );
};