// src/services/chatService.ts
import apiClient from '../utils/axios';
import type {
  ChatMessageRequest,
  ChatMessageResponse,
  Conversation,
} from '../types/chat.types';

export const chatService = {
  // Send message via HTTP
  async sendMessage(request: ChatMessageRequest): Promise<ChatMessageResponse> {
    const response = await apiClient.post<ChatMessageResponse>(
      '/api/chat/message',
      request
    );
    return response.data;
  },

  // Get all conversations
  async getConversations(limit: number = 20): Promise<Conversation[]> {
    const response = await apiClient.get<Conversation[]>(
      `/api/chat/conversations?limit=${limit}`
    );
    return response.data;
  },

  // Get conversation by ID
  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await apiClient.get<Conversation>(
      `/api/chat/conversations/${conversationId}`
    );
    return response.data;
  },

  // Create new conversation
  async createConversation(title?: string): Promise<Conversation> {
    const response = await apiClient.post<Conversation>(
      '/api/chat/conversations',
      { title }
    );
    return response.data;
  },

  // Delete conversation
  async deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(`/api/chat/conversations/${conversationId}`);
  },
};