// src/redux/conversationSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  ConversationDto,
  MessageDto,
  ParticipantDto,
  ConversationState,
} from '../types/conversation.types';

const initialState: ConversationState = {
  conversations: [],
  currentConversation: null,
  messages: {},
  typingUsers: {},
  isConnected: false,
  isLoading: false,
  error: null,
};

const conversationSlice = createSlice({
  name: 'conversation',
  initialState,
  reducers: {
    // Connection State
    setIsConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },

    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Conversations
    setConversations: (state, action: PayloadAction<ConversationDto[]>) => {
      state.conversations = action.payload;
    },

    addConversation: (state, action: PayloadAction<ConversationDto>) => {
      const exists = state.conversations.find(
        (c) => c.conversationId === action.payload.conversationId
      );
      if (!exists) {
        state.conversations.unshift(action.payload);
      }
    },

    updateConversation: (state, action: PayloadAction<ConversationDto>) => {
      const index = state.conversations.findIndex(
        (c) => c.conversationId === action.payload.conversationId
      );
      if (index !== -1) {
        state.conversations[index] = action.payload;
      }
      if (state.currentConversation?.conversationId === action.payload.conversationId) {
        state.currentConversation = action.payload;
      }
    },

    removeConversation: (state, action: PayloadAction<string>) => {
      state.conversations = state.conversations.filter(
        (c) => c.conversationId !== action.payload
      );
      if (state.currentConversation?.conversationId === action.payload) {
        state.currentConversation = null;
      }
      delete state.messages[action.payload];
      delete state.typingUsers[action.payload];
    },

    setCurrentConversation: (state, action: PayloadAction<ConversationDto | null>) => {
      state.currentConversation = action.payload;
    },

    updateConversationLastMessage: (
      state,
      action: PayloadAction<{ conversationId: string; message: MessageDto }>
    ) => {
      const { conversationId, message } = action.payload;
      const conversation = state.conversations.find((c) => c.conversationId === conversationId);
      if (conversation) {
        conversation.lastMessage = message;
        conversation.lastMessageAt = message.createdAt;
        
        // Move to top of list
        state.conversations = [
          conversation,
          ...state.conversations.filter((c) => c.conversationId !== conversationId),
        ];
      }
    },

    incrementUnreadCount: (state, action: PayloadAction<string>) => {
      const conversation = state.conversations.find(
        (c) => c.conversationId === action.payload
      );
      if (conversation) {
        conversation.unreadCount += 1;
      }
    },

    resetUnreadCount: (state, action: PayloadAction<string>) => {
      const conversation = state.conversations.find(
        (c) => c.conversationId === action.payload
      );
      if (conversation) {
        conversation.unreadCount = 0;
      }
    },

    // Messages
    setMessages: (
      state,
      action: PayloadAction<{ conversationId: string; messages: MessageDto[] }>
    ) => {
      const { conversationId, messages } = action.payload;
      state.messages[conversationId] = messages;
    },

    addMessage: (
      state,
      action: PayloadAction<{ conversationId: string; message: MessageDto }>
    ) => {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      
      // Check if message already exists
      const exists = state.messages[conversationId].find(
        (m) => m.messageId === message.messageId
      );
      
      if (!exists) {
        state.messages[conversationId].push(message);
      }
    },

    updateMessage: (
      state,
      action: PayloadAction<{ conversationId: string; message: MessageDto }>
    ) => {
      const { conversationId, message } = action.payload;
      if (state.messages[conversationId]) {
        const index = state.messages[conversationId].findIndex(
          (m) => m.messageId === message.messageId
        );
        if (index !== -1) {
          state.messages[conversationId][index] = message;
        }
      }
    },

    removeMessage: (
      state,
      action: PayloadAction<{ conversationId: string; messageId: string }>
    ) => {
      const { conversationId, messageId } = action.payload;
      if (state.messages[conversationId]) {
        state.messages[conversationId] = state.messages[conversationId].filter(
          (m) => m.messageId !== messageId
        );
      }
    },

    prependMessages: (
      state,
      action: PayloadAction<{ conversationId: string; messages: MessageDto[] }>
    ) => {
      const { conversationId, messages } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = messages;
      } else {
        state.messages[conversationId] = [...messages, ...state.messages[conversationId]];
      }
    },

    markMessageAsRead: (
      state,
      action: PayloadAction<{ conversationId: string; messageId: string; userId: string }>
    ) => {
      const { conversationId, messageId, userId } = action.payload;
      if (state.messages[conversationId]) {
        const message = state.messages[conversationId].find((m) => m.messageId === messageId);
        if (message) {
          message.isRead = true;
          const receiptExists = message.readReceipts.find((r) => r.userId === userId);
          if (!receiptExists) {
            message.readReceipts.push({
              userId,
              userName: 'User',
              readAt: new Date().toISOString(),
            });
          }
        }
      }
    },

    // Participants
    addParticipant: (
      state,
      action: PayloadAction<{ conversationId: string; participant: ParticipantDto }>
    ) => {
      const { conversationId, participant } = action.payload;
      const conversation = state.conversations.find((c) => c.conversationId === conversationId);
      if (conversation) {
        const exists = conversation.participants.find((p) => p.userId === participant.userId);
        if (!exists) {
          conversation.participants.push(participant);
        }
      }
      if (state.currentConversation?.conversationId === conversationId) {
        const exists = state.currentConversation.participants.find(
          (p) => p.userId === participant.userId
        );
        if (!exists) {
          state.currentConversation.participants.push(participant);
        }
      }
    },

    removeParticipant: (
      state,
      action: PayloadAction<{ conversationId: string; userId: string }>
    ) => {
      const { conversationId, userId } = action.payload;
      const conversation = state.conversations.find((c) => c.conversationId === conversationId);
      if (conversation) {
        conversation.participants = conversation.participants.filter(
          (p) => p.userId !== userId
        );
      }
      if (state.currentConversation?.conversationId === conversationId) {
        state.currentConversation.participants = state.currentConversation.participants.filter(
          (p) => p.userId !== userId
        );
      }
    },

    // Typing Indicators
    setUserTyping: (
      state,
      action: PayloadAction<{ conversationId: string; userId: string; userName: string; isTyping: boolean }>
    ) => {
      const { conversationId, userId, userName, isTyping } = action.payload;
      
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }

      if (isTyping) {
        const exists = state.typingUsers[conversationId].find((t) => t.userId === userId);
        if (!exists) {
          state.typingUsers[conversationId].push({
            conversationId,
            userId,
            userName,
            isTyping: true,
            startedAt: new Date().toISOString(),
          });
        }
      } else {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(
          (t) => t.userId !== userId
        );
      }
    },

    clearTypingUsers: (state, action: PayloadAction<string>) => {
      state.typingUsers[action.payload] = [];
    },

    // Reset
    resetConversationState: () => initialState,
  },
});

export const {
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
  resetConversationState,
} = conversationSlice.actions;

export default conversationSlice.reducer;



