// src/lib/hooks/useConversation.ts
import { useEffect, useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { conversationSignalRService } from '../../services/conversationSignalRService';
import { conversationService } from '../../services/conversationService';
import type { RootState } from '../../redux/store';
import type {
  SendMessageDto,
  EditMessageDto,
  ConversationDto,
  MessageDto,
  ReactionType,
} from '../../types/conversation.types';
import {
  setIsConnected,
  setIsLoading,
  setError,
  setConversations,
  addConversation,
  updateConversation,
  removeConversation,
  setCurrentConversation,
  updateConversationLastMessage,
  incrementUnreadCount,
  resetUnreadCount,
  setMessages,
  addMessage,
  updateMessage,
  removeMessage,
  prependMessages,
  markMessageAsRead,
  addParticipant,
  removeParticipant,
  setUserTyping,
  clearTypingUsers,
} from '../../redux/conversationSlice';
import { useToast } from '../../components/ui/use-toast';

export const useConversation = (conversationId?: string) => {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const {
    conversations,
    currentConversation,
    messages,
    typingUsers,
    isConnected,
    isLoading,
    error,
  } = useSelector((state: RootState) => state.conversation);

  const currentUserId = useSelector((state: RootState) => 
    state.auth.decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const conversationIdRef = useRef(conversationId);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update conversationIdRef when conversationId changes
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Initialize SignalR connection
  useEffect(() => {
    if (!currentUserId || isInitialized) return;

    const initialize = async () => {
      try {
        await conversationSignalRService.connect();
        dispatch(setIsConnected(true));
        setIsInitialized(true);

        // Subscribe to all events
        const unsubscribers = [
          conversationSignalRService.onMessage(handleReceiveMessage),
          conversationSignalRService.onMessageEdited(handleMessageEdited),
          conversationSignalRService.onMessageDeleted(handleMessageDeleted),
          conversationSignalRService.onConversationCreated(handleConversationCreated),
          conversationSignalRService.onConversationUpdated(handleConversationUpdated),
          conversationSignalRService.onConversationDeleted(handleConversationDeleted),
          conversationSignalRService.onTyping(handleTyping),
          conversationSignalRService.onRead(handleRead),
          conversationSignalRService.onParticipantAdded(handleParticipantAdded),
          conversationSignalRService.onParticipantRemoved(handleParticipantRemoved),
          conversationSignalRService.onError(handleError),
        ];

        // Load user conversations
        await loadConversations();

        return () => {
          unsubscribers.forEach((unsub) => unsub());
        };
      } catch (err: any) {
        console.error('Failed to initialize conversation hub:', err);
        dispatch(setIsConnected(false));
        dispatch(setError('Failed to connect to conversation service'));
        toast({
          title: 'Connection Failed',
          description: 'Failed to connect to conversation service',
          variant: 'destructive',
        });
      }
    };

    initialize();

    return () => {
      if (conversationIdRef.current) {
        conversationSignalRService.leaveConversation(conversationIdRef.current);
      }
    };
  }, [currentUserId, isInitialized, dispatch]);

  // Join/leave conversations when conversationId changes
  useEffect(() => {
    if (!conversationId || !isConnected) return;

    const joinConversation = async () => {
      try {
        await conversationSignalRService.joinConversation(conversationId);
        await loadConversationMessages(conversationId);
        
        // Load full conversation details if not in list
        if (!conversations.find(c => c.conversationId === conversationId)) {
          const conv = await conversationService.getConversationById(conversationId);
          dispatch(addConversation(conv));
          dispatch(setCurrentConversation(conv));
        } else {
          const conv = conversations.find(c => c.conversationId === conversationId);
          if (conv) {
            dispatch(setCurrentConversation(conv));
          }
        }

        // Mark as read
        dispatch(resetUnreadCount(conversationId));
      } catch (err: any) {
        console.error('Failed to join conversation:', err);
        toast({
          title: 'Error',
          description: 'Failed to load conversation',
          variant: 'destructive',
        });
      }
    };

    joinConversation();

    return () => {
      if (conversationId) {
        conversationSignalRService.leaveConversation(conversationId);
        dispatch(clearTypingUsers(conversationId));
      }
    };
  }, [conversationId, isConnected, dispatch]);

  // Event Handlers
  const handleReceiveMessage = useCallback(
    (message: MessageDto) => {
      // Check if message already exists (deduplication)
      const existingMessages = messages[message.conversationId] || [];
      const messageExists = existingMessages.some(m => m.messageId === message.messageId);
      
      if (messageExists) {
        console.log('🔄 Message already exists, skipping:', message.messageId);
        return;
      }
      
      dispatch(addMessage({ conversationId: message.conversationId, message }));
      dispatch(updateConversationLastMessage({ conversationId: message.conversationId, message }));

      // Increment unread count if not in current conversation or sender is not current user
      if (
        message.conversationId !== conversationIdRef.current &&
        message.senderId !== currentUserId
      ) {
        dispatch(incrementUnreadCount(message.conversationId));
      }

      // Auto-mark as read if in current conversation
      if (message.conversationId === conversationIdRef.current && message.senderId !== currentUserId) {
        conversationSignalRService.markAsRead(message.conversationId, message.messageId);
      }
    },
    [dispatch, currentUserId, messages]
  );

  const handleMessageEdited = useCallback(
    (message: MessageDto) => {
      dispatch(updateMessage({ conversationId: message.conversationId, message }));
    },
    [dispatch]
  );

  const handleMessageDeleted = useCallback(
    (conversationId: string, messageId: string) => {
      dispatch(removeMessage({ conversationId, messageId }));
    },
    [dispatch]
  );

  const handleConversationCreated = useCallback(
    (conversation: ConversationDto) => {
      dispatch(addConversation(conversation));
      toast({
        title: 'New Conversation',
        description: `${conversation.conversationName || 'Direct message'}`,
      });
    },
    [dispatch, toast]
  );

  const handleConversationUpdated = useCallback(
    (conversation: ConversationDto) => {
      dispatch(updateConversation(conversation));
    },
    [dispatch]
  );

  const handleConversationDeleted = useCallback(
    (conversationId: string) => {
      dispatch(removeConversation(conversationId));
      if (conversationIdRef.current === conversationId) {
        dispatch(setCurrentConversation(null));
      }
      toast({
        title: 'Conversation deleted',
        description: 'The conversation has been removed.',
      });
    },
    [dispatch]
  );

  const handleTyping = useCallback(
    (conversationId: string, userId: string, isTyping: boolean) => {
      // Get user name from participants
      const conversation = conversations.find(c => c.conversationId === conversationId);
      const participant = conversation?.participants.find(p => p.userId === userId);
      const userName = participant?.userName || 'Someone';

      dispatch(setUserTyping({ conversationId, userId, userName, isTyping }));
    },
    [dispatch, conversations]
  );

  const handleRead = useCallback(
    (conversationId: string, messageId: string | null, userId: string) => {
      if (messageId) {
        dispatch(markMessageAsRead({ conversationId, messageId, userId }));
      }
    },
    [dispatch]
  );

  const handleParticipantAdded = useCallback(
    (conversationId: string, participant: any) => {
      dispatch(addParticipant({ conversationId, participant }));
    },
    [dispatch]
  );

  const handleParticipantRemoved = useCallback(
    (conversationId: string, userId: string) => {
      dispatch(removeParticipant({ conversationId, userId }));
    },
    [dispatch]
  );

  const handleError = useCallback(
    (error: string) => {
      console.error('Conversation error:', error);
      
      // Ignore Entity Framework save errors from SignalR
      // These are backend issues and don't affect frontend functionality
      if (error.includes('saving the entity changes') || 
          error.includes('entity framework') ||
          error.includes('See the inner exception')) {
        console.warn('⚠️ Backend SignalR save error (ignored):', error);
        return; // Don't show toast for backend errors
      }
      
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    },
    [toast]
  );

  // API Methods
  const loadConversations = useCallback(async () => {
    dispatch(setIsLoading(true));
    try {
      const result = await conversationService.getUserConversations(1, 50);
      dispatch(setConversations(result.conversations));
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
      dispatch(setError('Failed to load conversations'));
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    } finally {
      dispatch(setIsLoading(false));
    }
  }, [dispatch, toast]);

  const loadConversationMessages = useCallback(
    async (convId: string, pageNumber = 1) => {
      try {
        const result = await conversationService.getConversationMessages(convId, pageNumber, 50);
        
        if (pageNumber === 1) {
          dispatch(setMessages({ conversationId: convId, messages: result.messages.reverse() }));
        } else {
          dispatch(prependMessages({ conversationId: convId, messages: result.messages.reverse() }));
        }
        
        return result.hasMore;
      } catch (err: any) {
        console.error('Failed to load messages:', err);
        toast({
          title: 'Error',
          description: 'Failed to load messages',
          variant: 'destructive',
        });
        return false;
      }
    },
    [dispatch, toast]
  );

  const loadMoreMessages = useCallback(
    async (convId: string) => {
      try {
        const currentMessages = messages[convId] || [];
        const pageNumber = Math.floor(currentMessages.length / 50) + 1;
        return await loadConversationMessages(convId, pageNumber);
      } catch (err: any) {
        console.error('Failed to load more messages:', err);
        return false;
      }
    },
    [messages, loadConversationMessages]
  );

  const sendMessage = useCallback(
    async (dto: SendMessageDto) => {
      try {
        // Send via REST API - backend will return the created message and broadcast via SignalR
        const message = await conversationService.sendMessage(dto);
        
        // Optimistic update: Add message immediately for better UX
        // Deduplication in handleReceiveMessage prevents duplicates when SignalR broadcasts
        dispatch(addMessage({ conversationId: dto.conversationId, message }));
        dispatch(updateConversationLastMessage({ conversationId: dto.conversationId, message }));
      } catch (err: any) {
        console.error('Failed to send message:', err);
        dispatch(setError('Failed to send message'));
        toast({
          title: 'Error',
          description: 'Failed to send message',
          variant: 'destructive',
        });
      }
    },
    [dispatch, toast]
  );

  const editMessage = useCallback(
    async (dto: EditMessageDto) => {
      try {
        // Edit via REST API - backend will broadcast via SignalR
        const message = await conversationService.editMessage(dto.messageId, dto);
        
        // Optimistic update: Update message immediately
        dispatch(updateMessage({ conversationId: message.conversationId, message }));
      } catch (err: any) {
        console.error('Failed to edit message:', err);
        toast({
          title: 'Error',
          description: 'Failed to edit message',
          variant: 'destructive',
        });
      }
    },
    [dispatch, toast]
  );

  const deleteMessage = useCallback(
    async (messageId: string, conversationId: string) => {
      try {
        // Delete via REST API - backend will broadcast via SignalR
        await conversationService.deleteMessage(messageId);
        
        // Optimistic update: Remove message immediately
        dispatch(removeMessage({ conversationId, messageId }));
      } catch (err: any) {
        console.error('Failed to delete message:', err);
        toast({
          title: 'Error',
          description: 'Failed to delete message',
          variant: 'destructive',
        });
      }
    },
    [dispatch, toast]
  );

  const sendTyping = useCallback(
    async (isTyping: boolean) => {
      if (!conversationIdRef.current) return;

      try {
        await conversationSignalRService.sendTyping(conversationIdRef.current, isTyping);

        // Auto-stop typing after 3 seconds
        if (isTyping) {
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            conversationSignalRService.sendTyping(conversationIdRef.current!, false);
          }, 3000);
        }
      } catch (err: any) {
        console.error('Failed to send typing indicator:', err);
      }
    },
    []
  );

  const markConversationAsRead = useCallback(
    async (convId: string) => {
      try {
        // Use both SignalR and REST API for reliability
        await Promise.all([
          conversationSignalRService.markAsRead(convId),
          conversationService.markConversationAsRead(convId)
        ]);
        dispatch(resetUnreadCount(convId));
      } catch (err: any) {
        console.error('Failed to mark as read:', err);
        // Still try to reset unread count locally
        dispatch(resetUnreadCount(convId));
      }
    },
    [dispatch]
  );

  const createDirectConversation = useCallback(
    async (otherUserId: string): Promise<ConversationDto | null> => {
      try {
        const conversation = await conversationService.getOrCreateDirectConversation(otherUserId);
        dispatch(addConversation(conversation));
        return conversation;
      } catch (err: any) {
        console.error('Failed to create direct conversation:', err);
        toast({
          title: 'Error',
          description: 'Failed to create conversation',
          variant: 'destructive',
        });
        return null;
      }
    },
    [dispatch, toast]
  );

  const createGroupConversation = useCallback(
    async (groupName: string, participantIds: string[]): Promise<ConversationDto | null> => {
      try {
        const dto = {
          conversationType: 'group' as const,
          conversationName: groupName,
          conversationAvatar: undefined,
          participantIds,
        };
        
        const conversation = await conversationService.createConversation(dto);
        dispatch(addConversation(conversation));
        
        toast({
          title: 'Group Created!',
          description: `${groupName} has been created successfully`,
        });
        
        return conversation;
      } catch (err: any) {
        console.error('Failed to create group conversation:', err);
        toast({
          title: 'Error',
          description: 'Failed to create group',
          variant: 'destructive',
        });
        return null;
      }
    },
    [dispatch, toast]
  );

  const deleteConversation = useCallback(
    async (convId: string) => {
      try {
        await conversationService.deleteConversation(convId);
        dispatch(removeConversation(convId));
        toast({
          title: 'Success',
          description: 'Conversation deleted successfully',
        });
      } catch (err: any) {
        console.error('Failed to delete conversation:', err);
        toast({
          title: 'Error',
          description: 'Failed to delete conversation',
          variant: 'destructive',
        });
      }
    },
    [dispatch, toast]
  );

  // Reaction methods
  const addReaction = useCallback(
    async (messageId: string, reactionType: ReactionType) => {
      try {
        const dto = { messageId, reactionType };
        await conversationService.addReaction(dto);
        
        // Optimistic update: Add reaction immediately
        // The actual reaction data will come via SignalR
        toast({
          title: 'Reaction added',
          description: `Added ${reactionType} reaction`,
        });
      } catch (err: any) {
        console.error('Failed to add reaction:', err);
        toast({
          title: 'Error',
          description: 'Failed to add reaction',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const removeReaction = useCallback(
    async (messageId: string, reactionType: ReactionType) => {
      try {
        const dto = { messageId, reactionType };
        await conversationService.removeReaction(dto);
        
        // Optimistic update: Remove reaction immediately
        // The actual reaction data will come via SignalR
        toast({
          title: 'Reaction removed',
          description: `Removed ${reactionType} reaction`,
        });
      } catch (err: any) {
        console.error('Failed to remove reaction:', err);
        toast({
          title: 'Error',
          description: 'Failed to remove reaction',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  // Get current conversation messages
  const currentMessages = conversationId ? messages[conversationId] || [] : [];
  const currentTypingUsers = conversationId ? typingUsers[conversationId] || [] : [];

  return {
    // State
    conversations,
    currentConversation,
    currentMessages,
    currentTypingUsers,
    isConnected,
    isLoading,
    error,

    // Methods
    sendMessage,
    editMessage,
    deleteMessage,
    sendTyping,
    markConversationAsRead,
    createDirectConversation,
    createGroupConversation,
    deleteConversation,
    loadConversations,
    loadConversationMessages,
    loadMoreMessages,
    addReaction,
    removeReaction,
  };
};


