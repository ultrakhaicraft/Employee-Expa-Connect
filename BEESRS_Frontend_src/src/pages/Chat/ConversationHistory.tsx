// src/pages/Chat/ConversationHistory.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Clock, Trash2, Plus, ChevronRight, AlertTriangle } from 'lucide-react';
import { chatService } from '../../services/chatService';
import type { Conversation } from '../../types/chat.types';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";

interface ConversationHistoryProps {
  currentConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (conversationId: string) => void;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const data = await chatService.getConversations(20);
      setConversations(data);
    } catch (error) {
      toast.error('Could not load chat history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting conversation
    setIdToDelete(conversationId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!idToDelete) return;
    
    const conversationId = idToDelete;
    setDeletingId(conversationId);
    setShowDeleteConfirm(false);
    
    try {
      await chatService.deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c.conversationId !== conversationId));
      toast.success('Conversation deleted');
      
      // If deleting current conversation, create new one
      if (conversationId === currentConversationId) {
        onNewConversation();
      }
      
      onDeleteConversation?.(conversationId);
    } catch (error) {
      toast.error('Unable to delete conversation');
    } finally {
      setDeletingId(null);
      setIdToDelete(null);
    }
  };

  const getTitleDisplay = (conv: Conversation) => {
    if (conv.title && conv.title !== 'New Conversation') {
      return conv.title;
    }
    // Use first message as title if available
    if (conv.messages && conv.messages.length > 0) {
      const firstUserMsg = conv.messages.find(m => m.senderType?.toLowerCase() === 'user');
      if (firstUserMsg) {
        return firstUserMsg.messageText.substring(0, 50) + (firstUserMsg.messageText.length > 50 ? '...' : '');
      }
    }
    return 'New conversation';
  };

  const getTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: enUS 
      });
    } catch {
      return 'Just now';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-800 text-sm">Chat history</h3>
          <button
            onClick={onNewConversation}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="New conversation"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {conversations.length} conversations
        </p>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No conversations yet</p>
            <button
              onClick={onNewConversation}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              Start chatting
            </button>
          </div>
        ) : (
          <AnimatePresence>
            {conversations.map((conv) => (
              <motion.div
                key={conv.conversationId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                onClick={() => onSelectConversation(conv.conversationId)}
                className={`
                  group relative px-4 py-3 cursor-pointer transition-all border-b border-gray-100
                  hover:bg-gray-50
                  ${conv.conversationId === currentConversationId 
                    ? 'bg-blue-50 border-l-4 border-l-blue-600' 
                    : 'border-l-4 border-l-transparent'
                  }
                `}
              >
                {/* Content */}
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                    ${conv.conversationId === currentConversationId 
                      ? 'bg-blue-100' 
                      : 'bg-gray-100'
                    }
                  `}>
                    <MessageSquare className={`w-4 h-4 ${
                      conv.conversationId === currentConversationId 
                        ? 'text-blue-600' 
                        : 'text-gray-600'
                    }`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className={`
                      text-sm font-medium truncate
                      ${conv.conversationId === currentConversationId 
                        ? 'text-blue-900' 
                        : 'text-gray-800'
                      }
                    `}>
                      {getTitleDisplay(conv)}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {getTimeAgo(conv.lastActivityAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center gap-1">
                    {deletingId === conv.conversationId ? (
                      <div className="w-6 h-6 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent" />
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleDelete(conv.conversationId, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-100 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                    
                    {conv.conversationId === currentConversationId && (
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Chat history is saved automatically
        </p>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="z-[10000] w-[90%] max-w-[320px] rounded-2xl p-6">
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-lg font-bold text-gray-900">
              Delete Chat?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-gray-500">
              This will permanently delete this conversation and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col gap-2 sm:flex-col sm:gap-2">
            <AlertDialogAction
              onClick={confirmDelete}
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 font-semibold transition-all active:scale-95"
            >
              Delete
            </AlertDialogAction>
            <AlertDialogCancel
              className="w-full border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl py-2.5 font-semibold transition-all active:scale-95 m-0"
            >
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

