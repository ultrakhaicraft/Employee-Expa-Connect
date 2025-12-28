// src/pages/User/Conversations/ConversationDetail.tsx
import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  MapPin,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  CheckCheck,
  Smile,
  X,
  MessageCircle,
  Plus,
  Video,
  Phone,
} from 'lucide-react';
import type { MessageDto, ConversationDto, TypingStatusDto, ReactionType } from '../../../types/conversation.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { ReactionPicker } from '../../../components/Chat/ReactionPicker';
import { ReactionDisplay } from '../../../components/Chat/ReactionDisplay';
import { MediaUpload } from '../../../components/Chat/MediaUpload';
import { LocationCard } from '../../../components/Chat/LocationCard';
import { uploadToCloudinary } from '../../../services/cloudinaryService';
import { toast } from 'sonner';
import { useVideoCall } from '../../../lib/hooks/useVideoCall';
import { useAudioCall } from '../../../lib/hooks/useAudioCall';
import { VideoCallModal } from '../../../components/VideoCall/VideoCallModal';
import { AudioCallModal } from '../../../components/VideoCall/AudioCallModal';

interface ConversationDetailProps {
  conversation: ConversationDto;
  messages: MessageDto[];
  typingUsers: TypingStatusDto[];
  currentUserId: string;
  onSendMessage: (content: string, type: 'text' | 'image' | 'video' | 'location', mediaData?: any) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onTyping: (isTyping: boolean) => void;
  onAddReaction?: (messageId: string, reactionType: ReactionType) => void;
  onRemoveReaction?: (messageId: string, reactionType: ReactionType) => void;
}

export const ConversationDetail: React.FC<ConversationDetailProps> = ({
  conversation,
  messages,
  typingUsers,
  currentUserId,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onTyping,
  onAddReaction,
  onRemoveReaction,
}) => {
  const [inputText, setInputText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [reactionPickerPosition, setReactionPickerPosition] = useState({ x: 0, y: 0 });
  const [pendingMedia, setPendingMedia] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get other user for direct conversations
  const otherParticipant = conversation.conversationType === 'direct' 
    ? conversation.participants.find(p => p.userId !== currentUserId)
    : null;

  // Video call hook - only for direct conversations
  const videoCall = useVideoCall({
    conversationId: conversation.conversationId,
    otherUserId: otherParticipant?.userId || '',
    otherUserName: otherParticipant?.userName || undefined
  });

  // Audio call hook - only for direct conversations
  const audioCall = useAudioCall({
    conversationId: conversation.conversationId,
    otherUserId: otherParticipant?.userId || '',
    otherUserName: otherParticipant?.userName || undefined
  });

  // Auto-scroll to bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: messages.length > 0 ? 'smooth' : 'auto',
    });
  }, [messages, typingUsers]);

  // Focus input when editing
  useEffect(() => {
    if (editingMessageId) {
      inputRef.current?.focus();
    }
  }, [editingMessageId]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping(false); // Ensure typing is stopped when component unmounts
    };
  }, [onTyping]);

  // Reaction handlers
  const handleReactionClick = (messageId: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setReactionPickerPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
    setReactionPickerMessageId(messageId);
    setReactionPickerOpen(true);
  };

  const handleReactionSelect = (reactionType: ReactionType) => {
    if (reactionPickerMessageId) {
      onAddReaction?.(reactionPickerMessageId, reactionType);
    }
    setReactionPickerOpen(false);
    setReactionPickerMessageId(null);
  };

  const handleReactionDisplayClick = (reactionType: ReactionType) => {
    if (reactionPickerMessageId) {
      // Check if user already reacted with this type
      const message = messages.find(m => m.messageId === reactionPickerMessageId);
      const reaction = message?.reactions?.find(r => r.reactionType === reactionType);
      
      if (reaction?.hasCurrentUser) {
        onRemoveReaction?.(reactionPickerMessageId, reactionType);
      } else {
        onAddReaction?.(reactionPickerMessageId, reactionType);
      }
    }
  };

  const handleMediaSelect = async (media: any) => {
    // For location, send immediately
    if (media.type === 'location') {
      onSendMessage('📍 Location', 'location', {
        location: {
          latitude: media.latitude,
          longitude: media.longitude,
          address: media.locationName
        },
        locationName: media.locationName
      });
      return;
    }

    // For image/video, set pending media first (will upload when sending)
    if (media.type === 'image' || media.type === 'video') {
      setPendingMedia(media);
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator only if user is actually typing (not just selecting/deleting all text)
    if (text.trim().length > 0) {
      onTyping(true);

      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    } else {
      // Immediately stop typing when input is empty
      onTyping(false);
    }
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text && !pendingMedia) return;

    // Clear typing timeout before sending
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing indicator
    onTyping(false);

    if (editingMessageId) {
      onEditMessage(editingMessageId, text);
      setEditingMessageId(null);
      setInputText('');
      return;
    }

    // Handle media upload
    if (pendingMedia) {
      if (pendingMedia.type === 'location') {
        // Location doesn't need upload
        onSendMessage(text || '📍 Location', 'location', {
          location: {
            latitude: pendingMedia.latitude,
            longitude: pendingMedia.longitude,
            address: pendingMedia.locationName
          },
          locationName: pendingMedia.locationName
        });
        setPendingMedia(null);
        setInputText('');
        return;
      }

      // For image/video, upload to Cloudinary first
      if ((pendingMedia.type === 'image' || pendingMedia.type === 'video') && pendingMedia.file) {
        try {
          setIsUploading(true);
          setUploadProgress(0);
          
          // Simulate progress (Cloudinary doesn't provide progress events, so we simulate)
          const progressInterval = setInterval(() => {
            setUploadProgress((prev) => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                return 90;
              }
              return prev + 10;
            });
          }, 200);
          
          // Upload to Cloudinary
          const uploadResult = await uploadToCloudinary(pendingMedia.file, {
            folder: 'messages'
          });
          
          clearInterval(progressInterval);
          setUploadProgress(100);
          
          // Small delay to show 100% progress
          await new Promise(resolve => setTimeout(resolve, 300));
          
          setIsUploading(false);
          setUploadProgress(0);
          
          // Send message with Cloudinary URL
          const mediaContent = pendingMedia.type === 'image' ? '📷 Photo' : '🎥 Video';
          onSendMessage(text || mediaContent, pendingMedia.type, {
            url: uploadResult.secure_url,
            fileName: pendingMedia.fileName,
            fileSize: pendingMedia.fileSize,
            mimeType: pendingMedia.mimeType,
            thumbnailUrl: pendingMedia.thumbnailUrl,
            duration: pendingMedia.duration
          });
        } catch (error: any) {
          console.error('Failed to upload media to Cloudinary:', error);
          setIsUploading(false);
          setUploadProgress(0);
          toast.error(error.message || 'Failed to upload media. Please try again.');
          return; // Don't clear pendingMedia on error so user can retry
        }
      } else if (pendingMedia.url) {
        // If URL is already provided (shouldn't happen, but handle it)
        onSendMessage(text || '', pendingMedia.type, pendingMedia);
      }
      
      setPendingMedia(null);
    } else {
      // Text message
      onSendMessage(text, 'text');
    }

    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startEditing = (message: MessageDto) => {
    setEditingMessageId(message.messageId);
    setInputText(message.messageContent || '');
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setInputText('');
  };

  const getConversationTitle = () => {
    if (conversation.conversationType === 'direct') {
      const otherParticipant = conversation.participants.find(
        (p) => p.userId !== currentUserId
      );
      return otherParticipant?.userName || 'Unknown User';
    }
    return conversation.conversationName || 'Group Chat';
  };

  const renderMessage = (message: MessageDto, index: number) => {
    const isOwn = message.senderId === currentUserId;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar =
      !prevMessage || prevMessage.senderId !== message.senderId;
    
    // Check if this message is part of a group (consecutive messages from same sender)
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
    const isLastInGroup = !nextMessage || nextMessage.senderId !== message.senderId;

    return (
      <motion.div
        key={message.messageId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`flex gap-2 group ${isLastInGroup ? 'mb-4' : 'mb-1'} ${isOwn ? 'justify-end' : 'justify-start'}`}
      >
        {/* Avatar for others */}
            {!isOwn && (
              <>
                {isLastInGroup ? (
                  message.senderAvatar ? (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-lg ring-2 ring-white"
                    >
                      <img
                        src={message.senderAvatar}
                        alt={message.senderName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to gradient if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.parentElement?.querySelector('.sender-avatar-fallback') as HTMLElement;
                          if (fallback) {
                            fallback.style.display = 'flex';
                          }
                        }}
                      />
                      <div 
                        className="sender-avatar-fallback w-full h-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold"
                        style={{ display: 'none' }}
                      >
                        {message.senderName.charAt(0).toUpperCase()}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg ring-2 ring-white"
                    >
                      {message.senderName.charAt(0).toUpperCase()}
                    </motion.div>
                  )
                ) : (
                  <div className="w-10" />
                )}
              </>
            )}

        {/* Message Bubble */}
        <div className={`flex flex-col max-w-[65%] ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Sender Name (for group chats) */}
          {!isOwn && showAvatar && conversation.conversationType === 'group' && (
            <span className="text-xs font-medium text-gray-700 mb-1 px-3">
              {message.senderName}
            </span>
          )}

          {/* Message Content */}
          <div className="relative group">
            {/* Image/Video messages - no background border */}
            {(message.messageType === 'image' || message.messageType === 'video') && message.fileUrl ? (
              <div className="rounded-2xl overflow-hidden shadow-lg">
                {message.messageType === 'image' && (
                  <>
                    <img
                      src={message.fileUrl}
                      alt="Shared image"
                      className="max-w-sm max-h-64 object-contain"
                    />
                    {message.messageContent && message.messageContent !== '📷 Photo' && (
                      <div className="px-3 py-1.5">
                        <p className="text-sm text-gray-700">{message.messageContent}</p>
                      </div>
                    )}
                    <div className="px-3 py-1.5">
                      <p className="text-xs text-gray-500">
                        {format(new Date(message.createdAt), 'HH:mm')}
                      </p>
                    </div>
                  </>
                )}
                {message.messageType === 'video' && (
                  <>
                    <video
                      src={message.fileUrl}
                      controls
                      preload="metadata"
                      className="max-w-sm max-h-64 bg-black"
                      style={{ minHeight: '150px' }}
                      onError={(e) => {
                        console.error('Video load error:', e);
                        const target = e.target as HTMLVideoElement;
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
                              <p class="text-sm text-red-600">Video không thể tải. URL: ${message.fileUrl}</p>
                              <a href="${message.fileUrl}" target="_blank" class="text-xs text-blue-600 underline mt-2 block">Mở video trong tab mới</a>
                            </div>
                          `;
                        }
                      }}
                    >
                      Your browser does not support the video tag.
                      <a href={message.fileUrl} target="_blank" className="text-blue-500 underline">
                        Download video
                      </a>
                    </video>
                    {message.messageContent && message.messageContent !== '🎥 Video' && (
                      <div className="px-3 py-1.5">
                        <p className="text-sm text-gray-700">{message.messageContent}</p>
                      </div>
                    )}
                    <div className="px-3 py-1.5">
                      <p className="text-xs text-gray-500">
                        {format(new Date(message.createdAt), 'HH:mm')}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <motion.div
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`
                  relative px-4 py-3 backdrop-blur-sm
                  ${isOwn
                    ? `bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl ${
                        isLastInGroup ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-r-md'
                      }`
                    : `bg-white text-gray-900 shadow-md hover:shadow-lg border border-gray-100 ${
                        isLastInGroup ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl rounded-l-md'
                      }`
                  }
                `}
              >
                {message.isDeleted ? (
                  <p className="text-sm italic opacity-60">Message deleted</p>
                ) : (
                  <>
                    {message.messageType === 'text' && (
                      <p className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
                        isOwn ? 'text-white' : 'text-gray-800'
                      }`}>
                        {message.messageContent}
                      </p>
                    )}
                    {message.messageType === 'video' && !message.fileUrl && (
                      <p className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
                        isOwn ? 'text-white' : 'text-gray-800'
                      }`}>
                        {message.messageContent || 'Video message'}
                      </p>
                    )}
                    {message.messageType === 'location' && message.latitude && message.longitude && (
                      <div className="mt-2">
                        <LocationCard
                          location={{
                            latitude: message.latitude,
                            longitude: message.longitude,
                            address: message.locationName
                          }}
                          locationName={message.locationName}
                          timestamp={format(new Date(message.createdAt), 'HH:mm')}
                          showMap={true}
                          onGetDirections={() => {
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${message.latitude},${message.longitude}`;
                            window.open(url, '_blank');
                          }}
                          onViewOnMap={() => {
                            const url = `https://www.google.com/maps?q=${message.latitude},${message.longitude}`;
                            window.open(url, '_blank');
                          }}
                        />
                      </div>
                    )}
                    {message.messageType === 'location' && !message.latitude && !message.longitude && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-medium">{message.locationName || 'Location'}</span>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* Message Actions - Hover Options */}
            {!message.isDeleted && (
              <div className={`
                absolute ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 
                opacity-0 group-hover:opacity-100 transition-opacity
                flex items-center gap-1
              `}>
                {/* Emoji/Reaction button */}
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="p-2 rounded-full bg-white shadow-lg hover:bg-yellow-50 transition-colors border border-gray-200"
                  onClick={() => {/* TODO: Add reaction */}}
                >
                  <Smile className="w-4 h-4 text-gray-600 hover:text-yellow-500" />
                </motion.button>

                {/* More Options */}
                {isOwn && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        className="p-2 rounded-full bg-white shadow-lg hover:bg-gray-100 transition-colors border border-gray-200"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                      </motion.button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => startEditing(message)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Message
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDeleteMessage(message.messageId)}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Message
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>

          {/* Message Meta - Only show on last message in group */}
          {isLastInGroup && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-1.5 mt-1.5 px-3"
            >
              <span className={`text-xs font-medium ${isOwn ? 'text-blue-600' : 'text-gray-500'}`}>
                {format(new Date(message.createdAt), 'HH:mm')}
              </span>
              {message.isEdited && (
                <span className="text-xs text-gray-400">• Edited</span>
              )}
              {isOwn && (
                <motion.span 
                  className="ml-0.5"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                >
                  {message.readReceipts.length > 0 ? (
                    <CheckCheck className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Check className="w-4 h-4 text-gray-400" />
                  )}
                </motion.span>
              )}
            </motion.div>
          )}
          
          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="mt-2">
              <ReactionDisplay
                reactions={message.reactions}
                onReactionClick={handleReactionDisplayClick}
              />
            </div>
          )}
          
          {/* Reaction Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              handleReactionClick(message.messageId, e);
            }}
            className="mt-1 p-2 rounded-full hover:bg-gray-100 transition-all duration-200 opacity-0 group-hover:opacity-100 hover:opacity-100 z-10 relative"
            title="Add reaction"
          >
            <Plus className="w-4 h-4 text-gray-500 hover:text-gray-700" />
          </motion.button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3 px-6 py-4 bg-white border-b border-gray-200 shadow-sm"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {conversation.conversationAvatar ? (
            <motion.div 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="w-12 h-12 rounded-full overflow-hidden shadow-lg ring-2 ring-purple-100 flex-shrink-0"
            >
              <img
                src={conversation.conversationAvatar}
                alt={getConversationTitle()}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to gradient if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                }}
              />
              <div 
                className="avatar-fallback w-full h-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-lg"
                style={{ display: 'none' }}
              >
                {getConversationTitle().charAt(0).toUpperCase()}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-purple-100 flex-shrink-0"
            >
              {getConversationTitle().charAt(0).toUpperCase()}
            </motion.div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg truncate">
              {getConversationTitle()}
            </h3>
          </div>
        </div>
        
        {/* Call Buttons - Only for direct conversations */}
        {conversation.conversationType === 'direct' && otherParticipant && (
          <div className="flex items-center gap-2">
            {/* Audio Call Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onClick={() => audioCall.startCall()}
              disabled={audioCall.isCalling || audioCall.isInCall || videoCall.isCalling || videoCall.isInCall}
              className="p-2.5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Audio call ${otherParticipant.userName || 'friend'}`}
            >
              <Phone className="w-5 h-5" />
            </motion.button>
            {/* Video Call Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onClick={() => videoCall.startCall()}
              disabled={videoCall.isCalling || videoCall.isInCall || audioCall.isCalling || audioCall.isInCall}
              className="p-2.5 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Video call ${otherParticipant.userName || 'friend'}`}
            >
              <Video className="w-5 h-5" />
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 bg-gradient-to-b from-blue-50/30 via-purple-50/20 to-white scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="text-center px-6"
            >
              <motion.div 
                className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center shadow-2xl ring-4 ring-white"
                animate={{ 
                  boxShadow: [
                    "0 10px 30px rgba(59, 130, 246, 0.3)",
                    "0 10px 30px rgba(168, 85, 247, 0.3)",
                    "0 10px 30px rgba(236, 72, 153, 0.3)",
                    "0 10px 30px rgba(59, 130, 246, 0.3)",
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <MessageCircle className="w-12 h-12 text-blue-600" />
              </motion.div>
              <motion.h3 
                className="text-xl font-bold text-gray-900 mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Start the conversation
              </motion.h3>
              <motion.p 
                className="text-gray-600 text-base"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Say hello to begin chatting! 👋
              </motion.p>
            </motion.div>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((message, index) => renderMessage(message, index))}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="flex gap-3 mb-3"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-white">
                  {typingUsers[0].userName.charAt(0).toUpperCase()}
                </div>
                <div className="bg-white rounded-2xl rounded-bl-md px-6 py-4 shadow-lg border border-gray-100">
                  <div className="flex gap-1.5">
                    <motion.div 
                      className="w-2.5 h-2.5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full" 
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div 
                      className="w-2.5 h-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full" 
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div 
                      className="w-2.5 h-2.5 bg-gradient-to-br from-pink-500 to-red-500 rounded-full" 
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>

      {/* Input Area */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 py-5 bg-gradient-to-r from-white via-blue-50/20 to-purple-50/20 border-t border-gray-200 shadow-2xl backdrop-blur-sm"
      >
        {/* Editing Banner */}
        <AnimatePresence>
          {editingMessageId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between mb-3 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200"
            >
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Editing message</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={cancelEditing}
                className="p-1 rounded-full hover:bg-blue-100 transition-colors"
              >
                <X className="w-4 h-4 text-blue-600" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Row */}
        <div className="flex items-center gap-3">
          {/* Media Upload */}
          <MediaUpload
            onMediaSelect={handleMediaSelect}
            disabled={!!editingMessageId}
          />

          {/* Text Input */}
          <div className="flex-1 relative">
            {/* Pending Media Preview */}
            {pendingMedia && (
              <div className={`mb-2 p-3 rounded-lg border ${
                isUploading 
                  ? 'bg-blue-100 border-blue-300' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {pendingMedia.type === 'image' && (
                      <img
                        src={pendingMedia.url}
                        alt="Preview"
                        className={`w-12 h-12 object-cover rounded-lg ${
                          isUploading ? 'opacity-60' : ''
                        }`}
                      />
                    )}
                    {pendingMedia.type === 'video' && (
                      <video
                        src={pendingMedia.url}
                        className={`w-12 h-12 object-cover rounded-lg ${
                          isUploading ? 'opacity-60' : ''
                        }`}
                      />
                    )}
                    {pendingMedia.type === 'location' && (
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-green-600" />
                      </div>
                    )}
                    {/* Uploading overlay */}
                    {isUploading && (
                      <div className="absolute inset-0 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {isUploading 
                          ? `Uploading ${pendingMedia.type}...`
                          : pendingMedia.type === 'location' 
                            ? `Location: ${pendingMedia.locationName}`
                            : `Ready to send ${pendingMedia.type}`
                        }
                      </p>
                      {isUploading && (
                        <span className="text-xs font-semibold text-blue-600">
                          {uploadProgress}%
                        </span>
                      )}
                    </div>
                    {pendingMedia.fileName && (
                      <p className="text-xs text-gray-500 truncate">{pendingMedia.fileName}</p>
                    )}
                    {/* Progress bar */}
                    {isUploading && (
                      <div className="mt-2 w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {!isUploading && (
                    <button
                      onClick={() => {
                        setPendingMedia(null);
                        setIsUploading(false);
                        setUploadProgress(0);
                      }}
                      className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                </div>
              </div>
            )}
            
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={pendingMedia ? "Add a caption..." : "Type a message..."}
              rows={1}
              className="w-full px-5 py-3.5 pr-14 border-2 border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-h-32 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
              style={{ 
                minHeight: '52px',
                lineHeight: '24px'
              }}
            />
            {/* Emoji Button */}
            <motion.button
              whileHover={{ scale: 1.2, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-yellow-50 transition-colors"
              title="Add emoji"
            >
              <Smile className="w-5 h-5 text-gray-500 hover:text-yellow-500 transition-colors" />
            </motion.button>
          </div>

          {/* Send Button */}
          <motion.button
            whileHover={{ scale: (inputText.trim() || pendingMedia) && !isUploading ? 1.1 : 1 }}
            whileTap={{ scale: (inputText.trim() || pendingMedia) && !isUploading ? 0.9 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={handleSend}
            disabled={(!inputText.trim() && !pendingMedia) || isUploading}
            className={`
              p-3.5 rounded-full transition-all duration-300 relative
              ${isUploading
                ? 'bg-blue-400 text-white cursor-wait shadow-lg'
                : (inputText.trim() || pendingMedia)
                  ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white hover:shadow-2xl shadow-lg hover:shadow-blue-500/50'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-sm'
              }
            `}
            title={isUploading ? 'Uploading...' : 'Send message'}
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Reaction Picker */}
      <ReactionPicker
        isOpen={reactionPickerOpen}
        onClose={() => setReactionPickerOpen(false)}
        onSelectReaction={handleReactionSelect}
        position={reactionPickerPosition}
      />

      {/* Video Call Modal - Only for direct conversations */}
      {conversation.conversationType === 'direct' && (videoCall.isInCall || videoCall.isIncomingCall) && (
        <VideoCallModal
          localStream={videoCall.localStream}
          remoteStream={videoCall.remoteStream}
          isIncomingCall={videoCall.isIncomingCall}
          callerInfo={videoCall.callerInfo}
          onAnswer={videoCall.answerCall}
          onReject={videoCall.rejectCall}
          onEnd={videoCall.endCall}
        />
      )}

      {/* Audio Call Modal - Only for direct conversations */}
      {conversation.conversationType === 'direct' && (audioCall.isInCall || audioCall.isIncomingCall) && (
        <AudioCallModal
          localStream={audioCall.localStream}
          remoteStream={audioCall.remoteStream}
          isIncomingCall={audioCall.isIncomingCall}
          callerInfo={audioCall.callerInfo}
          onAnswer={audioCall.answerCall}
          onReject={audioCall.rejectCall}
          onEnd={audioCall.endCall}
        />
      )}
    </div>
  );
};



