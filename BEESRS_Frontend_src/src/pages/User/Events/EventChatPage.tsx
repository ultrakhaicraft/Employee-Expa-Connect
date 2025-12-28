import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Users,
  Calendar,
  Smile,
  MapPin,
  Clock,
  CheckCircle2,
  Info,
  Video
} from 'lucide-react';
import eventService from '../../../services/eventService';
import type { EventResponse } from '../../../types/event.types';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Separator } from '../../../components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { format } from 'date-fns';
import axiosInstance from '../../../utils/axios';
import { conversationSignalRService } from '../../../services/conversationSignalRService';
import type { ConversationDto } from '../../../types/conversation.types';
import { MediaUpload } from '../../../components/Chat/MediaUpload';
import { LocationMessage } from '../../../components/Chat/LocationMessage';
import { X } from 'lucide-react';
import { isLocationMessage } from '../../../utils/geocoding';
import { useVideoCall } from '../../../lib/hooks/useVideoCall';
import { VideoCallModal } from '../../../components/VideoCall/VideoCallModal';
import { convertUtcToLocalTime } from '../../../utils/timezone';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  timestamp: string;
  type: 'text' | 'system' | 'image' | 'video';
}

const EventChatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [conversation, setConversation] = useState<ConversationDto | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{
    type: 'image' | 'video' | 'location';
    file?: File;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    url?: string;
    thumbnailUrl?: string;
    duration?: number;
    locationName?: string;
    latitude?: number;
    longitude?: number;
  } | null>(null);
  const [selectedCallUserId, setSelectedCallUserId] = useState<string | null>(null);

  // Get current user ID
  const authState = useSelector((state: any) => state.auth);
  const currentUserId =
    authState?.decodedToken?.[
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
    ];

  // Video call hook - initialize with first available participant or empty
  // We'll update the selected user when needed
  const firstOtherParticipant = event?.participants.find(p => p.userId !== currentUserId && p.invitationStatus === 'accepted');
  const videoCall = useVideoCall({
    conversationId: conversation?.conversationId || '',
    otherUserId: selectedCallUserId || firstOtherParticipant?.userId || '',
    otherUserName: selectedCallUserId 
      ? (event?.participants.find(p => p.userId === selectedCallUserId)?.fullName || undefined)
      : (firstOtherParticipant?.fullName || undefined)
  });

  const handleStartVideoCall = async (participantId: string) => {
    if (!conversation?.conversationId) {
      toast.error('Chat is not ready yet');
      return;
    }
    setSelectedCallUserId(participantId);
    // Wait a bit for state to update
    setTimeout(() => {
      videoCall.startCall();
    }, 100);
  };

  useEffect(() => {
    if (id) {
      initializeChat();
    }

    return () => {
      // Cleanup: disconnect SignalR when component unmounts
      // Note: conversation state might not be set yet, so we check it in cleanup
    };
  }, [id]);

  // Debug: Log conversation state changes
  useEffect(() => {
    console.log('Conversation state changed:', conversation?.conversationId || 'null');
  }, [conversation]);

  // Separate cleanup effect for conversation
  useEffect(() => {
    return () => {
      if (conversation?.conversationId) {
        conversationSignalRService.leaveConversation(conversation.conversationId);
      }
    };
  }, [conversation?.conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      console.log('Initializing chat for event:', id);
      
      // Fetch event details
      await fetchEventDetails();
      
      // Get or create conversation
      console.log('Fetching conversation...');
      const conversationResponse = await axiosInstance.get(`/api/Event/${id}/chat`);
      const convData = conversationResponse.data;
      console.log('Conversation response:', convData);
      console.log('Response type:', typeof convData);
      console.log('Response keys:', Object.keys(convData || {}));
      
      // Handle different response formats
      let rawConvData = convData;
      
      // Check if response is wrapped in ApiResponse
      if (convData?.data) {
        rawConvData = convData.data;
        console.log('Response wrapped in ApiResponse, using data:', rawConvData);
      }
      
      // Map PascalCase to camelCase
      const conv: ConversationDto = {
        conversationId: rawConvData.ConversationId || rawConvData.conversationId,
        conversationType: rawConvData.ConversationType || rawConvData.conversationType || 'event',
        conversationName: rawConvData.ConversationName || rawConvData.conversationName,
        conversationAvatar: rawConvData.ConversationAvatar || rawConvData.conversationAvatar,
        createdBy: rawConvData.CreatedBy || rawConvData.createdBy,
        isActive: rawConvData.IsActive ?? rawConvData.isActive ?? true,
        createdAt: rawConvData.CreatedAt || rawConvData.createdAt,
        updatedAt: rawConvData.UpdatedAt || rawConvData.updatedAt,
        lastMessageAt: rawConvData.LastMessageAt || rawConvData.lastMessageAt,
        participants: (rawConvData.Participants || rawConvData.participants || []).map((p: any) => ({
          participantId: p.ParticipantId || p.participantId,
          userId: p.UserId || p.userId,
          userName: p.UserName || p.userName,
          userAvatar: p.UserAvatar || p.userAvatar,
          role: p.Role || p.role || 'member',
          joinedAt: p.JoinedAt || p.joinedAt,
          leftAt: p.LeftAt || p.leftAt,
          isActive: p.IsActive ?? p.isActive ?? true,
          lastReadAt: p.LastReadAt || p.lastReadAt,
          notificationEnabled: p.NotificationEnabled ?? p.notificationEnabled ?? true,
          nickname: p.Nickname || p.nickname,
          isOnline: p.IsOnline ?? p.isOnline ?? false,
        })),
        lastMessage: rawConvData.LastMessage || rawConvData.lastMessage,
        unreadCount: rawConvData.UnreadCount || rawConvData.unreadCount || 0,
      };
      
      console.log('Mapped conversation:', conv);
      console.log('Conversation ID:', conv.conversationId);
      
      if (!conv.conversationId) {
        console.error('Conversation ID is missing! Raw data:', rawConvData);
        throw new Error('Conversation ID is missing from response');
      }
      
      // Set conversation immediately using functional update to ensure it's set
      setConversation((prev) => {
        console.log('Setting conversation from', prev?.conversationId, 'to', conv.conversationId);
        return conv;
      });
      
      // Also set it directly to ensure state update
      setConversation(conv);
      console.log('Conversation state set:', conv.conversationId);
      
      // Wait a bit to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Connect to SignalR
      console.log('Connecting to SignalR...');
      await connectSignalR(conv.conversationId);
      
      // Fetch messages
      console.log('Fetching messages...');
      await fetchChatMessages();
      
      console.log('Chat initialized successfully');
      
      // Set loading to false after successful initialization
      setLoading(false);
    } catch (error: any) {
      console.error('Failed to initialize chat:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to initialize chat. Please refresh the page.';
      
      toast.error(errorMessage, {
        duration: 5000,
        description: error.response?.status ? `Status: ${error.response.status}` : undefined
      });
      
      // Set loading to false so user can see the error
      setLoading(false);
    }
  };

  const connectSignalR = async (conversationId: string) => {
    try {
      console.log('Connecting to SignalR hub...');
      
      // Connect to SignalR hub with timeout protection
      const connectPromise = conversationSignalRService.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SignalR connection timeout after 30s')), 30000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      console.log('SignalR connected successfully');
      
      // Join conversation room
      console.log('Joining conversation:', conversationId);
      await conversationSignalRService.joinConversation(conversationId);
      console.log('Joined conversation successfully');
      
      // Listen for new messages
      conversationSignalRService.onMessage((message: any) => {
        const msgId = message.ConversationId || message.conversationId;
        if (msgId === conversationId) {
          const chatMsg = mapMessageDtoToChatMessage(message);
          setMessages((prev) => {
            // Avoid duplicates
            const messageId = message.MessageId || message.messageId;
            if (prev.some(m => m.id === messageId?.toString())) {
              return prev;
            }
            return [...prev, chatMsg];
          });
        }
      });
      
      // Listen for errors (but don't show timeout errors as they're handled by reconnect)
      conversationSignalRService.onError((error: string) => {
        console.error('SignalR error:', error);
        // Only show non-timeout errors to user
        if (!error.toLowerCase().includes('timeout')) {
          toast.error(`Chat error: ${error}`, { duration: 3000 });
        }
      });
    } catch (error: any) {
      console.error('Failed to connect SignalR:', error);
      const errorMessage = error.message || 'Unknown error';
      
      if (errorMessage.includes('timeout')) {
        toast.error('Connection timeout. Real-time features may be limited. Automatic reconnection will be attempted.', {
          duration: 5000
        });
      } else {
        toast.error('Failed to connect to real-time chat. Messages may not update in real-time.', {
          duration: 5000
        });
      }
      // Don't throw - allow chat to work without real-time features
      // Automatic reconnect will handle reconnection attempts
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchEventDetails = async () => {
    if (!id) return;
    try {
      const eventData = await eventService.getEvent(id);
      setEvent(eventData);
    } catch (error: any) {
      toast.error('Failed to fetch event details');
    }
  };

  const fetchChatMessages = async () => {
    if (!id) return;
    try {
      const response = await axiosInstance.get(`/api/Event/${id}/chat/messages`, {
        params: { pageNumber: 1, pageSize: 100 }
      });
      
      const data = response.data;
      // Handle both PascalCase and camelCase
      const messagesList = data.Messages || data.messages || [];
      
      if (messagesList.length > 0) {
        const chatMessages = messagesList.map(mapMessageDtoToChatMessage);
        setMessages(chatMessages);
      } else {
        // Add welcome message if no messages
        setMessages([
          {
            id: 'system-welcome',
            userId: 'system',
            userName: 'System',
            message: 'Welcome to the event group chat! 🎉',
            timestamp: new Date().toISOString(),
            type: 'system',
          },
        ]);
      }
    } catch (error: any) {
      console.error('Failed to fetch messages:', error);
      // Add welcome message on error
      setMessages([
        {
          id: 'system-welcome',
          userId: 'system',
          userName: 'System',
          message: 'Welcome to the event group chat! 🎉',
          timestamp: new Date().toISOString(),
          type: 'system',
        },
      ]);
    }
  };

  const mapMessageDtoToChatMessage = (msg: any): ChatMessage => {
    // Handle both PascalCase (backend) and camelCase (frontend types)
    const messageId = msg.MessageId || msg.messageId;
    const senderId = msg.SenderId || msg.senderId;
    const senderName = msg.SenderName || msg.senderName;
    const senderAvatar = msg.SenderAvatar || msg.senderAvatar;
    const messageContent = msg.MessageContent || msg.messageContent;
    const fileUrl = msg.FileUrl || msg.fileUrl;
    const createdAt = msg.CreatedAt || msg.createdAt;
    const messageType = msg.MessageType || msg.messageType || 'text';
    
    // For image/video messages, use FileUrl if available, otherwise use MessageContent
    const mediaUrl = (messageType === 'image' || messageType === 'video') && fileUrl 
      ? fileUrl 
      : messageContent;
    
    return {
      id: messageId?.toString() || Date.now().toString(),
      userId: senderId?.toString() || 'unknown',
      userName: senderName || 'Unknown',
      userAvatar: senderAvatar || undefined,
      message: mediaUrl || messageContent || '',
      timestamp: createdAt || new Date().toISOString(),
      type: messageType === 'text' ? 'text' : 
            messageType === 'image' ? 'image' : 
            messageType === 'video' ? 'video' : 
            'text',
    };
  };

  const handleMediaSelect = (media: {
    type: 'image' | 'video' | 'location';
    file?: File;
    fileName?: string;
    url?: string;
    locationName?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    setPendingMedia(media);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('handleSendMessage called', { 
      newMessage: newMessage.trim(), 
      pendingMedia,
      id, 
      currentUserId, 
      conversation: conversation?.conversationId 
    });
    
    if (!newMessage.trim() && !pendingMedia) {
      console.log('Message and media are empty');
      return;
    }
    
    if (!id) {
      console.log('Event ID is missing');
      toast.error('Event ID is missing');
      return;
    }
    
    if (!currentUserId) {
      console.log('Current user ID is missing');
      toast.error('Please log in to send messages');
      return;
    }
    
    if (!conversation || !conversation.conversationId) {
      console.log('Conversation not initialized yet');
      toast.error('Chat is still initializing. Please wait...');
      return;
    }

    const messageToSend = newMessage.trim();
    const mediaToSend = pendingMedia;
    setNewMessage(''); // Clear input immediately for better UX
    setPendingMedia(null); // Clear pending media

    try {
      setSending(true);
      
      // If sending media, upload it first
      let mediaUrl: string | undefined = undefined;
      let fileName: string | undefined = undefined;
      let fileSize: number | undefined = undefined;
      let fileMimeType: string | undefined = undefined;
      
      if (mediaToSend) {
        if (mediaToSend.type === 'image' || mediaToSend.type === 'video') {
          if (mediaToSend.file) {
            try {
              toast.info('Uploading media...');
              const formData = new FormData();
              formData.append('file', mediaToSend.file);
              
              // Upload to backend
              const uploadResponse = await axiosInstance.post(`/api/Event/${id}/chat/messages/upload-media`, formData, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              });
              
              mediaUrl = uploadResponse.data.fileUrl;
              fileName = uploadResponse.data.fileName;
              fileSize = uploadResponse.data.fileSize;
              fileMimeType = uploadResponse.data.fileMimeType;
              
              toast.success('Media uploaded successfully!');
            } catch (uploadError: any) {
              console.error('Failed to upload media:', uploadError);
              toast.error(uploadError.response?.data?.message || 'Failed to upload media. Please try again.');
              setSending(false);
              return;
            }
          } else if (mediaToSend.url) {
            // If URL is already provided (e.g., from preview) - this shouldn't happen for new uploads
            // But handle it just in case
            mediaUrl = mediaToSend.url;
            fileName = mediaToSend.fileName;
            fileSize = mediaToSend.fileSize;
            fileMimeType = mediaToSend.mimeType;
          }
        } else if (mediaToSend.type === 'location') {
          // For location, send as text with coordinates
          const locationText = mediaToSend.locationName || 
            `${mediaToSend.latitude}, ${mediaToSend.longitude}`;
          const locationMessage = `📍 Location: ${locationText}`;
          
          const response = await axiosInstance.post(`/api/Event/${id}/chat/messages`, {
            MessageType: 'text',
            MessageContent: locationMessage + (messageToSend ? `\n\n${messageToSend}` : ''),
          });

          const sentMessage = response.data;
          const chatMsg = mapMessageDtoToChatMessage(sentMessage);
          
          setMessages((prev) => {
            if (prev.some(m => m.id === chatMsg.id)) {
              return prev;
            }
            return [...prev, chatMsg];
          });

          toast.success('Location shared!');
          setSending(false);
          return;
        }
      }
      
      console.log('Sending message to API:', {
        url: `/api/Event/${id}/chat/messages`,
        conversationId: conversation.conversationId,
        message: messageToSend,
        mediaType: mediaToSend?.type,
        mediaUrl
      });
      
      // Send message via API (which also triggers SignalR broadcast)
      const messageType = mediaToSend?.type === 'image' ? 'image' : 
                         mediaToSend?.type === 'video' ? 'video' : 'text';
      const messageContent = mediaUrl ? mediaUrl : messageToSend;
      
      const messagePayload: any = {
        MessageType: messageType,
        MessageContent: messageContent || (mediaToSend ? 'Media shared' : ''),
      };
      
      // Add file metadata if available
      if (mediaUrl && fileName) {
        messagePayload.FileUrl = mediaUrl;
        messagePayload.FileName = fileName;
        if (fileSize) messagePayload.FileSize = fileSize;
        if (fileMimeType) messagePayload.FileMimeType = fileMimeType;
        if (mediaToSend?.duration) messagePayload.Duration = Math.round(mediaToSend.duration);
      }
      
      const response = await axiosInstance.post(`/api/Event/${id}/chat/messages`, messagePayload);

      console.log('Message sent successfully:', response.data);

      // Message will be added via SignalR ReceiveMessage event
      // But we can also add it optimistically if needed
      const sentMessage = response.data;
      const chatMsg = mapMessageDtoToChatMessage(sentMessage);
      
      // Add optimistically (SignalR will also send it, but we avoid duplicate check)
      setMessages((prev) => {
        if (prev.some(m => m.id === chatMsg.id)) {
          return prev;
        }
        return [...prev, chatMsg];
      });

      toast.success('Message sent!');
    } catch (error: any) {
      console.error('Failed to send message:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        requestData: {
          MessageType: 'text',
          MessageContent: messageToSend,
        }
      });
      
      // Log validation errors if present
      if (error.response?.data?.errors) {
        console.error('Validation errors:', error.response.data.errors);
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.Message || 
                          'Failed to send message. Please try again.';
      
      toast.error(errorMessage, {
        duration: 5000,
        description: error.response?.data?.errors ? 
          Object.values(error.response.data.errors).flat().join(', ') : 
          undefined
      });
      
      // Restore message on error
      setNewMessage(messageToSend);
    } finally {
      setSending(false);
    }
  };

  const isMyMessage = (msg: ChatMessage) => msg.userId === currentUserId;
  const isSystemMessage = (msg: ChatMessage) => msg.type === 'system';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span>Loading chat...</span>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white shadow-2xl">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate(`/user/events/${id}`)}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              {/* Event Avatar */}
              {event.eventImageUrl && (
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30 shadow-lg flex-shrink-0">
                  <img
                    src={event.eventImageUrl}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-6 w-6" />
                  <h1 className="text-xl font-bold">Event Chat</h1>
                </div>
                <p className="text-sm text-white/80 mt-1">{event.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <Users className="h-5 w-5" />
                <span>{event.participants.length} members</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="shadow-2xl border-0 overflow-hidden">
              {/* Info Banner */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-200 p-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      Group Chat for Event Planning
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Discuss venues, preferences, and coordinate with team members
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <CardContent className="p-0">
                <div className="h-[calc(100vh-400px)] overflow-y-auto scrollbar-thin p-6 space-y-4 bg-gradient-to-br from-gray-50 to-white">
                  {messages.map((msg) => {
                    if (isSystemMessage(msg)) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <div className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 px-4 py-2 rounded-full text-sm shadow-sm">
                            {msg.message}
                          </div>
                        </div>
                      );
                    }

                    const isMine = isMyMessage(msg);

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'} items-end gap-2`}
                      >
                        {!isMine && (
                          msg.userAvatar ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-md">
                              <img
                                src={msg.userAvatar}
                                alt={msg.userName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to gradient if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.parentElement?.querySelector('.user-avatar-fallback') as HTMLElement;
                                  if (fallback) {
                                    fallback.style.display = 'flex';
                                  }
                                }}
                              />
                              <div 
                                className="user-avatar-fallback w-full h-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold text-sm"
                                style={{ display: 'none' }}
                              >
                                {msg.userName?.charAt(0).toUpperCase() || 'U'}
                              </div>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md bg-gradient-to-br from-purple-400 to-blue-400 flex-shrink-0">
                              <span>{msg.userName?.charAt(0).toUpperCase() || 'U'}</span>
                            </div>
                          )
                        )}
                        <div
                          className={`max-w-[70%] ${
                            isMine ? 'items-end' : 'items-start'
                          }`}
                        >
                          {!isMine && (
                            <p className="text-xs font-medium text-gray-600 mb-1 px-2">
                              {msg.userName}
                            </p>
                          )}
                          {/* Image/Video messages - no background border */}
                          {(msg.type === 'image' || msg.type === 'video') && msg.message ? (
                            <div className="rounded-2xl overflow-hidden shadow-md">
                              {msg.type === 'image' && (
                                <>
                                  <img
                                    src={msg.message}
                                    alt="Shared image"
                                    className="max-w-sm max-h-64 object-contain"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<p class="text-sm break-words px-4 py-3">Image not available</p>`;
                                      }
                                    }}
                                  />
                                  <div className="px-3 py-1.5">
                                    <p className="text-xs text-gray-500">
                                      {format(new Date(msg.timestamp), 'HH:mm')}
                                    </p>
                                  </div>
                                </>
                              )}
                              {msg.type === 'video' && (
                                <>
                                  <video
                                    src={msg.message}
                                    controls
                                    className="max-w-sm max-h-64 bg-black"
                                    style={{ minHeight: '150px' }}
                                    onError={(e) => {
                                      const target = e.target as HTMLVideoElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<p class="text-sm break-words px-4 py-3">Video not available</p>`;
                                      }
                                    }}
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                  <div className="px-3 py-1.5">
                                    <p className="text-xs text-gray-500">
                                      {format(new Date(msg.timestamp), 'HH:mm')}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <div
                              className={`rounded-2xl shadow-md overflow-hidden ${
                                isMine
                                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-br-sm'
                                  : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'
                              }`}
                            >

                              {/* Text Message */}
                              {msg.type === 'text' && (
                                <>
                                  {isLocationMessage(msg.message) ? (
                                    <LocationMessage
                                      message={msg.message}
                                      isMine={isMine}
                                      timestamp={format(new Date(msg.timestamp), 'HH:mm')}
                                    />
                                  ) : (
                                    <>
                                      <p className="text-sm break-words px-4 py-3">{msg.message}</p>
                                      <p
                                        className={`text-xs px-4 pb-3 ${
                                          isMine ? 'text-white/70' : 'text-gray-500'
                                        }`}
                                      >
                                        {format(new Date(msg.timestamp), 'HH:mm')}
                                      </p>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        {isMine && (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md bg-gradient-to-br from-green-400 to-green-600 flex-shrink-0">
                            {msg.userAvatar ? (
                              <img
                                src={msg.userAvatar}
                                alt="You"
                                className="w-full h-full rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <span>You</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-200 p-4 bg-white">
                  {!conversation && (
                    <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-700 flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-yellow-600 border-t-transparent"></div>
                        Initializing chat...
                      </p>
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    {/* Media Upload */}
                    <MediaUpload
                      onMediaSelect={handleMediaSelect}
                      disabled={sending || !conversation}
                    />

                    <div className="flex-1">
                      <div className="relative">
                        {/* Pending Media Preview */}
                        {pendingMedia && (
                          <div className={`mb-2 p-3 rounded-lg border ${
                            sending 
                              ? 'bg-blue-100 border-blue-300' 
                              : 'bg-blue-50 border-blue-200'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                {pendingMedia.type === 'image' && pendingMedia.url && (
                                  <img
                                    src={pendingMedia.url}
                                    alt="Preview"
                                    className={`w-12 h-12 object-cover rounded-lg ${
                                      sending ? 'opacity-60' : ''
                                    }`}
                                  />
                                )}
                                {pendingMedia.type === 'video' && pendingMedia.url && (
                                  <video
                                    src={pendingMedia.url}
                                    className={`w-12 h-12 object-cover rounded-lg ${
                                      sending ? 'opacity-60' : ''
                                    }`}
                                  />
                                )}
                                {pendingMedia.type === 'location' && (
                                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <MapPin className="w-6 h-6 text-green-600" />
                                  </div>
                                )}
                                {/* Uploading overlay */}
                                {sending && (pendingMedia.type === 'image' || pendingMedia.type === 'video') && (
                                  <div className="absolute inset-0 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {sending && (pendingMedia.type === 'image' || pendingMedia.type === 'video')
                                    ? `Uploading ${pendingMedia.type}...`
                                    : pendingMedia.type === 'location' 
                                      ? `Location: ${pendingMedia.locationName}`
                                      : `Ready to send ${pendingMedia.type}`
                                  }
                                </p>
                                {pendingMedia.fileName && (
                                  <p className="text-xs text-gray-500 truncate">{pendingMedia.fileName}</p>
                                )}
                              </div>
                              {!sending && (
                                <button
                                  type="button"
                                  onClick={() => setPendingMedia(null)}
                                  className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                                >
                                  <X className="w-4 h-4 text-gray-500" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        <textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage(e);
                            }
                          }}
                          placeholder={pendingMedia ? "Add a caption..." : "Type your message..."}
                          rows={1}
                          className="w-full px-4 py-3 pr-14 rounded-2xl border-2 border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 resize-none transition-all"
                          style={{ minHeight: '48px', maxHeight: '120px' }}
                        />
                        <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                            title="Add emoji"
                          >
                            <Smile className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={(!newMessage.trim() && !pendingMedia) || sending || !conversation}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-2xl h-12 w-12 p-0 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed relative"
                      title={!conversation ? 'Chat is initializing...' : sending ? 'Uploading...' : (!newMessage.trim() && !pendingMedia) ? 'Type a message or attach media' : 'Send message'}
                    >
                      {sending ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </form>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Press Enter to send • Shift + Enter for new line
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Info Card */}
            <Card className="shadow-lg border-2 border-purple-200">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-purple-600" />
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="text-sm font-semibold">
                        {format(new Date(event.scheduledDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-500">Time</p>
                      <p className="text-sm font-semibold">
                        {convertUtcToLocalTime(event.scheduledTime, event.timezone)}
                      </p>
                    </div>
                  </div>
                  {event.finalPlaceName && (
                    <div className="flex items-center space-x-3 p-2 rounded-lg bg-green-50 border border-green-200">
                      <MapPin className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-xs text-green-600 font-medium">Venue</p>
                        <p className="text-sm font-semibold text-green-900">
                          {event.finalPlaceName}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/user/events/${id}`)}
                >
                  View Full Event Details
                </Button>
              </CardContent>
            </Card>

            {/* Participants Card */}
            <Card className="shadow-lg border-2 border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="mr-2 h-5 w-5 text-blue-600" />
                    Members
                  </div>
                  <Badge className="bg-blue-600">{event.participants.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto scrollbar-thin pt-4">
                <div className="space-y-2">
                  {event.participants.map((participant) => {
                    const isCurrentUser = participant.userId === currentUserId;
                    const canCall = participant.invitationStatus === 'accepted' && !isCurrentUser && conversation?.conversationId;
                    const p = participant as any;
                    const avatarUrl = p.profilePictureUrl || 
                                     p.ProfilePictureUrl || 
                                     p.profilePicture ||
                                     p.ProfilePicture ||
                                     p.profile?.profilePictureUrl || 
                                     p.userProfile?.profilePictureUrl || 
                                     p.avatarUrl ||
                                     p.avatar ||
                                     p.profileImage ||
                                     p.AvatarUrl ||
                                     p.profile?.profileImage ||
                                     p.profile?.profilePicture;
                    
                    return (
                      <div
                        key={participant.userId}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10 shadow-md">
                            <AvatarImage 
                              src={avatarUrl} 
                              alt={participant.fullName || participant.email} 
                              className="object-cover"
                            />
                            <AvatarFallback 
                              className={`
                                text-white font-semibold text-sm
                                ${participant.invitationStatus === 'accepted'
                                  ? 'bg-gradient-to-br from-green-400 to-green-600'
                                  : 'bg-gradient-to-br from-gray-400 to-gray-600'
                                }
                              `}
                            >
                              {participant.fullName?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {participant.fullName || participant.email}
                            {isCurrentUser && <span className="text-gray-500 ml-1">(You)</span>}
                          </p>
                          <Badge
                            variant={
                              participant.invitationStatus === 'accepted'
                                ? 'default'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {participant.invitationStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {participant.invitationStatus === 'accepted' && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                          {canCall && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleStartVideoCall(participant.userId)}
                              title={`Video call ${participant.fullName || participant.email}`}
                            >
                              <Video className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Video Call Modal */}
      {(videoCall.isInCall || videoCall.isIncomingCall) && selectedCallUserId && (
        <VideoCallModal
          localStream={videoCall.localStream}
          remoteStream={videoCall.remoteStream}
          isIncomingCall={videoCall.isIncomingCall}
          callerInfo={videoCall.callerInfo}
          onAnswer={videoCall.answerCall}
          onReject={videoCall.rejectCall}
          onEnd={() => {
            videoCall.endCall();
            setSelectedCallUserId(null);
          }}
        />
      )}
    </div>
  );
};

export default EventChatPage;

