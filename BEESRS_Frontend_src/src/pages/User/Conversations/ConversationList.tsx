// src/pages/User/Conversations/ConversationList.tsx
import React, { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { MessageCircle, Users, MoreVertical, Trash2, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ConversationDto } from '../../../types/conversation.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Input } from '../../../components/ui/input';

interface ConversationListProps {
  conversations: ConversationDto[];
  currentConversationId?: string;
  currentUserId?: string;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentConversationId,
  currentUserId,
  onSelectConversation,
  onDeleteConversation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const getConversationTitle = (conversation: ConversationDto) => {
    if (conversation.conversationType === 'direct') {
      const otherParticipant = conversation.participants.find(
        (p) => p.userId !== currentUserId
      );
      return otherParticipant?.userName || 'Unknown User';
    }
    return conversation.conversationName || 'Group Chat';
  };

  const getConversationAvatar = (conversation: ConversationDto) => {
    if (conversation.conversationType === 'direct') {
      const otherParticipant = conversation.participants.find(
        (p) => p.userId !== currentUserId
      );
      return otherParticipant?.userAvatar;
    }
    return conversation.conversationAvatar;
  };

  const getLastMessagePreview = (conversation: ConversationDto) => {
    const lastMsg = conversation.lastMessage;
    if (!lastMsg) return 'No messages yet';

    const prefix = lastMsg.senderId === currentUserId ? 'You: ' : '';
    
    switch (lastMsg.messageType) {
      case 'text':
        return `${prefix}${lastMsg.messageContent}`;
      case 'image':
        return `${prefix}📷 Image`;
      case 'file':
        return `${prefix}📎 ${lastMsg.fileName}`;
      case 'location':
        return `${prefix}📍 ${lastMsg.locationName || 'Location'}`;
      default:
        return `${prefix}Message`;
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: enUS,
      });
    } catch {
      return '';
    }
  };

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter((conversation) => {
      const title = getConversationTitle(conversation).toLowerCase();
      const lastMessage = conversation.lastMessage?.messageContent?.toLowerCase() || '';
      return title.includes(query) || lastMessage.includes(query);
    });
  }, [conversations, searchQuery, currentUserId]);

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center mx-auto shadow-lg">
            <MessageCircle className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No conversations yet
          </h3>
          <p className="text-sm text-gray-500">
            Start a conversation with your friends
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-10 pr-10 py-2 w-full rounded-full border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        <AnimatePresence>
          {filteredConversations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full px-4 py-12 text-center"
            >
              <Search className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No conversations found</p>
            </motion.div>
          ) : (
            filteredConversations.map((conversation, index) => {
          const isSelected = conversation.conversationId === currentConversationId;
          const title = getConversationTitle(conversation);
          const avatar = getConversationAvatar(conversation);
          const preview = getLastMessagePreview(conversation);
          const time = formatTime(conversation.lastMessageAt);

          return (
            <motion.div
              key={conversation.conversationId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              layout
            >
              <div
                onClick={() => onSelectConversation(conversation.conversationId)}
                className={`
                  relative flex items-start gap-3 px-5 py-4 cursor-pointer
                  border-b border-gray-100 transition-all duration-200
                  ${isSelected 
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-l-blue-600' 
                    : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                  }
                `}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {avatar ? (
                    <motion.img
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                      src={avatar}
                      alt={title}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
                    />
                  ) : (
                    <motion.div 
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                      className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-md"
                    >
                      {conversation.conversationType === 'group' ? (
                        <Users className="w-7 h-7" />
                      ) : (
                        title.charAt(0).toUpperCase()
                      )}
                    </motion.div>
                  )}
                  {/* Online Status Indicator */}
                  {conversation.conversationType === 'direct' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`
                        absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white shadow-sm
                        ${conversation.participants.find(p => p.userId !== currentUserId)?.isOnline 
                          ? 'bg-green-500' 
                          : 'bg-gray-400'
                        }
                      `}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1.5">
                    <h4 className={`font-semibold truncate flex-1 ${
                      conversation.unreadCount > 0 ? 'text-gray-900' : 'text-gray-800'
                    }`}>
                      {title}
                    </h4>
                    <span className={`text-xs ml-2 flex-shrink-0 ${
                      conversation.unreadCount > 0 ? 'text-blue-600 font-semibold' : 'text-gray-500'
                    }`}>
                      {time}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className={`
                      text-sm truncate flex-1
                      ${conversation.unreadCount > 0 
                        ? 'text-gray-900 font-semibold' 
                        : 'text-gray-600'
                      }
                    `}>
                      {preview}
                    </p>
                    
                    {/* Unread Badge */}
                    {conversation.unreadCount > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-2 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white text-xs font-bold flex items-center justify-center shadow-md"
                      >
                        {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Options Menu */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger 
                      className="p-1.5 rounded-full hover:bg-white/50 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conversation.conversationId);
                        }}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
          );
        })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

