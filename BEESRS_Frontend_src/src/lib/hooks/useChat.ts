// src/lib/hooks/useChat.ts
import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { signalRService } from '../../services/signalRService';
import { chatService } from '../../services/chatService';
import type {
  ChatMessage,
  ChatMessageRequest,
  ChatMessageResponse,
  UserLocation,
} from '../../types/chat.types';
import {
  upsertMessage,
  setIsTyping,
  setIsConnected,
  setIsLoading,
  setError,
  setMessages,
  setCurrentConversation,
  setSuggestedActions,
  setSavedLocation,
} from '../../redux/chatSlice';
import type { RootState } from '../../redux/store';
import { store } from '../../redux/store';
import toast from 'react-hot-toast';

export const useChat = (conversationId?: string) => {
  const dispatch = useDispatch();
  const { messages, suggestedActions, isTyping, isConnected, isLoading, savedLocation } = useSelector(
    (state: RootState) => state.chat
  );

  const conversationIdRef = useRef(conversationId);

  useEffect(() => {
    const connect = async () => {
      const state = store.getState() as any;
      const token = state?.auth?.accessToken;
      
      if (!token) {
        dispatch(setIsConnected(false));
        return;
      }

      try {
        await signalRService.connect();
        dispatch(setIsConnected(true));

        const unsubscribeMessage = signalRService.onMessage(handleReceiveMessage);
        const unsubscribeTyping = signalRService.onTyping((typing) =>
          dispatch(setIsTyping(typing))
        );
        const unsubscribeError = signalRService.onError(handleError);

        if (conversationId) {
          await signalRService.joinConversation(conversationId);
        }

        return () => {
          unsubscribeMessage();
          unsubscribeTyping();
          unsubscribeError();
        };
      } catch (err: any) {
        dispatch(setIsConnected(false));
        const isAuthError = err?.message?.includes('authentication token') || 
                           err?.message?.includes('No authentication token');
        if (!isAuthError) {
          dispatch(setError('Failed to connect to chat service'));
          toast.error('Failed to connect to chat service');
        }
      }
    };

    connect();

    return () => {
      if (conversationId) {
        signalRService.leaveConversation(conversationId);
      }
    };
  }, [conversationId, dispatch]);

  useEffect(() => {
    if (conversationId) {
      loadConversationHistory(conversationId);
    }
  }, [conversationId]);

  const loadConversationHistory = async (convId: string) => {
    dispatch(setIsLoading(true));
    try {
      const conversation = await chatService.getConversation(convId);
      const normalizedMessages: ChatMessage[] = conversation.messages.map(m => ({
        ...m,
        senderType: (m.senderType?.toLowerCase() === 'user' ? 'user' : 'assistant') as 'user' | 'assistant'
      }));
      dispatch(setMessages(normalizedMessages));
      dispatch(setCurrentConversation(convId));
    } catch (err: any) {
      console.error('Failed to load conversation:', err);
      toast.error('Failed to load conversation history');
    } finally {
      dispatch(setIsLoading(false));
    }
  };

  const handleReceiveMessage = useCallback(
    (response: ChatMessageResponse) => {
      const referencedData = {
        places: response.places || [],
        suggestedActions: response.suggestedActions || [],
        intent: response.intent,
        extractedEntities: response.extractedEntities || [],
        ...response.additionalData
      };

      const assistantMessage: ChatMessage = {
        messageId: response.messageId,
        conversationId: response.conversationId,
        senderType: 'assistant',
        messageText: response.response,
        botResponseType: response.intent,
        detectedIntent: response.intent,
        processingTimeMs: response.processingTimeMs,
        referencedPlaces: referencedData,
        createdAt: response.timestamp,
      };

      dispatch(upsertMessage(assistantMessage));
      conversationIdRef.current = response.conversationId;
      dispatch(setCurrentConversation(response.conversationId));
      
      if (response.suggestedActions && response.suggestedActions.length > 0) {
        dispatch(setSuggestedActions(response.suggestedActions));
      }
    },
    [dispatch]
  );

  const handleError = useCallback(
    (error: any) => {
      const isAuthError = error?.message?.includes('authentication') || 
                         error?.message?.includes('token') ||
                         error?.message?.includes('unauthorized');
      if (!isAuthError) {
        toast.error(error.message || 'An error occurred');
      }
      dispatch(setIsTyping(false));
    },
    [dispatch]
  );

  const sendMessage = useCallback(
    async (text: string, location?: UserLocation, mediaData?: any) => {
      if (!text.trim() && !mediaData) return;

      const locationToUse = location || mediaData?.location || savedLocation;
      
      if (mediaData?.messageType === 'location' && mediaData?.location) {
        dispatch(setSavedLocation(mediaData.location));
      }

      const userMessage: ChatMessage = {
        messageId: crypto.randomUUID(),
        conversationId: conversationIdRef.current || '',
        senderType: 'user',
        messageText: text || '',
        messageType: mediaData?.messageType || 'text',
        mediaUrl: mediaData?.mediaUrl,
        mediaThumbnailUrl: mediaData?.mediaThumbnailUrl,
        mediaFileName: mediaData?.mediaFileName,
        mediaFileSize: mediaData?.mediaFileSize,
        mediaMimeType: mediaData?.mediaMimeType,
        mediaDuration: mediaData?.mediaDuration,
        location: locationToUse,
        locationName: mediaData?.locationName,
        createdAt: new Date().toISOString(),
      };

      dispatch(upsertMessage(userMessage));
      dispatch(setIsTyping(true));
      dispatch(setError(null));

      const request: ChatMessageRequest = {
        conversationId: conversationIdRef.current,
        message: text || '',
        language: 'vi',
        location: locationToUse,
      };

      try {
        if (signalRService.isConnected) {
          await signalRService.sendMessage(request);
        } else {
          const response = await chatService.sendMessage(request);
          handleReceiveMessage(response);
          dispatch(setIsTyping(false));
        }
      } catch (err: any) {
        dispatch(setError(err.message || 'Failed to send message'));
        toast.error('Failed to send message');
        dispatch(setIsTyping(false));
      }
    },
    [dispatch, handleReceiveMessage, savedLocation]
  );

  const clearChat = useCallback(() => {
    dispatch(setMessages([]));
    dispatch(setCurrentConversation(null));
    conversationIdRef.current = undefined;
  }, [dispatch]);

  return {
    messages,
    suggestedActions,
    sendMessage,
    isTyping,
    isConnected,
    isLoading,
    clearChat,
    conversationId: conversationIdRef.current,
  };
};
