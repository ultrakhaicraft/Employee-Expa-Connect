import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { ChatMessage, Conversation, SuggestedAction, UserLocation } from '../types/chat.types';

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: ChatMessage[];
  suggestedActions: SuggestedAction[];
  isTyping: boolean;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  savedLocation: UserLocation | null; // Remember location for follow-up questions
}

const initialState: ChatState = {
  conversations: [],
  currentConversationId: null,
  messages: [],
  suggestedActions: [],
  isTyping: false,
  isConnected: false,
  isLoading: false,
  error: null,
  savedLocation: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    setCurrentConversation: (state, action: PayloadAction<string | null>) => {
      state.currentConversationId = action.payload;
    },
    setMessages: (state, action: PayloadAction<ChatMessage[]>) => {
      state.messages = action.payload;
    },
    
    // ✅ THAY ĐỔI: addMessage → upsertMessage (update or insert)
    upsertMessage: (state, action: PayloadAction<ChatMessage>) => {
      const index = state.messages.findIndex(
        (m) => m.messageId === action.payload.messageId
      );
      
      if (index !== -1) {
        // Update existing message
        state.messages[index] = action.payload;
      } else {
        // Add new message
        state.messages.push(action.payload);
      }
    },
    
    setSuggestedActions: (state, action: PayloadAction<SuggestedAction[]>) => {
      state.suggestedActions = action.payload;
    },
    setIsTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },
    setIsConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
      state.currentConversationId = null;
    },
    setSavedLocation: (state, action: PayloadAction<UserLocation | null>) => {
      state.savedLocation = action.payload;
    },
    reset: () => initialState,
  },
});

export const {
  setConversations,
  setCurrentConversation,
  setMessages,
  upsertMessage, // ✅ Export upsertMessage
  setSuggestedActions,
  setIsTyping,
  setIsConnected,
  setIsLoading,
  setError,
  clearMessages,
  setSavedLocation,
  reset,
} = chatSlice.actions;

export default chatSlice.reducer;
