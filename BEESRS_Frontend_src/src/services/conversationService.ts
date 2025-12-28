// src/services/conversationService.ts
import apiClient from '../utils/axios';
import type {
  ConversationDto,
  ConversationListDto,
  CreateConversationDto,
  MessageDto,
  MessageListDto,
  ParticipantDto,
  AddParticipantsDto,
  UpdateParticipantRoleDto,
  SendMessageDto,
  EditMessageDto,
  AddReactionDto,
  RemoveReactionDto,
  MessageReactionDto,
  ReactionSummary,
} from '../types/conversation.types';

// Helper to unwrap backend response
interface BackendResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T;
  errors: string[];
  timestamp: string;
  traceId: string;
}

const unwrapResponse = <T>(response: any): T => {
  // If response already has the expected structure, return it
  if (response.isSuccess !== undefined && response.data !== undefined) {
    return response.data;
  }
  // Otherwise return response as-is
  return response;
};

export const conversationService = {
  // Conversation Management
  async createConversation(dto: CreateConversationDto): Promise<ConversationDto> {
    console.log('📤 Creating conversation:', dto);
    try {
      const response = await apiClient.post<BackendResponse<ConversationDto>>(
        '/api/Converstation/conversations',
        dto
      );
      console.log('✅ Conversation created:', response.data);
      return unwrapResponse(response.data);
    } catch (error: any) {
      console.error('❌ Create conversation error:', error);
      console.error('📋 Error response:', error.response?.data);
      throw error;
    }
  },

  async getConversationById(conversationId: string): Promise<ConversationDto> {
    const response = await apiClient.get<BackendResponse<ConversationDto>>(
      `/api/Converstation/conversations/${conversationId}`
    );
    return unwrapResponse(response.data);
  },

  async getUserConversations(
    pageNumber: number = 1,
    pageSize: number = 20
  ): Promise<ConversationListDto> {
    const response = await apiClient.get<BackendResponse<ConversationListDto>>(
      `/api/Converstation/conversations?pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
    return unwrapResponse(response.data);
  },

  async getOrCreateDirectConversation(
    otherUserId: string
  ): Promise<ConversationDto> {
    console.log('API Call: getOrCreateDirectConversation', { otherUserId });
    
    // Validate userId format
    if (!otherUserId || otherUserId.trim() === '') {
      throw new Error('Invalid user ID: User ID is required');
    }
    
    try {
      const response = await apiClient.post<BackendResponse<ConversationDto>>(
        `/api/Converstation/conversations/direct/${otherUserId}`
      );
      console.log('API Response:', response.data);
      return unwrapResponse(response.data);
    } catch (error: any) {
      console.error('API Error in getOrCreateDirectConversation:', error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  },

  async deleteConversation(conversationId: string): Promise<boolean> {
    const response = await apiClient.delete<BackendResponse<boolean>>(
      `/api/Converstation/conversations/${conversationId}`
    );
    return unwrapResponse(response.data);
  },

  async updateConversation(
    conversationId: string,
    name?: string,
    avatar?: string
  ): Promise<ConversationDto> {
    const response = await apiClient.put<BackendResponse<ConversationDto>>(
      `/api/Converstation/conversations/${conversationId}`,
      { name, avatar }
    );
    return unwrapResponse(response.data);
  },

  // Participant Management
  async addParticipants(
    conversationId: string,
    dto: AddParticipantsDto
  ): Promise<ParticipantDto[]> {
    const response = await apiClient.post<BackendResponse<ParticipantDto[]>>(
      `/api/Converstation/conversations/${conversationId}/participants`,
      dto
    );
    return unwrapResponse(response.data);
  },

  async removeParticipant(
    conversationId: string,
    userId: string
  ): Promise<boolean> {
    const response = await apiClient.delete<BackendResponse<boolean>>(
      `/api/Converstation/conversations/${conversationId}/participants/${userId}`
    );
    return unwrapResponse(response.data);
  },

  async leaveConversation(conversationId: string): Promise<boolean> {
    const response = await apiClient.post<BackendResponse<boolean>>(
      `/api/Converstation/conversations/${conversationId}/leave`
    );
    return unwrapResponse(response.data);
  },

  async updateParticipantRole(
    conversationId: string,
    participantId: string,
    dto: UpdateParticipantRoleDto
  ): Promise<boolean> {
    const response = await apiClient.put<BackendResponse<boolean>>(
      `/api/Converstation/conversations/${conversationId}/participants/${participantId}/role`,
      dto
    );
    return unwrapResponse(response.data);
  },

  async getConversationParticipants(
    conversationId: string
  ): Promise<ParticipantDto[]> {
    const response = await apiClient.get<BackendResponse<ParticipantDto[]>>(
      `/api/Converstation/conversations/${conversationId}/participants`
    );
    return unwrapResponse(response.data);
  },

  // Message Management
  async getConversationMessages(
    conversationId: string,
    pageNumber: number = 1,
    pageSize: number = 50
  ): Promise<MessageListDto> {
    const response = await apiClient.get<BackendResponse<MessageListDto>>(
      `/api/Converstation/conversations/${conversationId}/messages?pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
    return unwrapResponse(response.data);
  },

  async getNewMessages(
    conversationId: string,
    after: string
  ): Promise<MessageDto[]> {
    const response = await apiClient.get<BackendResponse<MessageDto[]>>(
      `/api/Converstation/conversations/${conversationId}/messages/new?after=${after}`
    );
    return unwrapResponse(response.data);
  },

  async sendMessage(dto: SendMessageDto): Promise<MessageDto> {
    console.log('📤 Sending message:', dto);
    try {
      const response = await apiClient.post<BackendResponse<MessageDto>>(
        '/api/Converstation/messages',
        dto
      );
      console.log('✅ Message sent successfully:', response.data);
      return unwrapResponse(response.data);
    } catch (error: any) {
      console.error('❌ Send message error:', error);
      console.error('📋 Full response data:', error.response?.data);
      console.error('🔍 Validation errors:', error.response?.data?.errors);
      console.error('📦 Request payload:', dto);
      
      // Log detailed validation errors
      if (error.response?.data?.errors) {
        console.group('🚨 Detailed Validation Errors:');
        Object.entries(error.response.data.errors).forEach(([field, messages]) => {
          console.error(`  ❌ ${field}:`, messages);
        });
        console.groupEnd();
      }
      
      throw error;
    }
  },

  async editMessage(messageId: string, dto: EditMessageDto): Promise<MessageDto> {
    const response = await apiClient.put<BackendResponse<MessageDto>>(
      `/api/Converstation/messages/${messageId}`,
      dto
    );
    return unwrapResponse(response.data);
  },

  async deleteMessage(messageId: string): Promise<boolean> {
    const response = await apiClient.delete<BackendResponse<boolean>>(
      `/api/Converstation/messages/${messageId}`
    );
    return unwrapResponse(response.data);
  },

  async markMessageAsRead(messageId: string): Promise<boolean> {
    const response = await apiClient.post<BackendResponse<boolean>>(
      `/api/Converstation/messages/${messageId}/read`
    );
    return unwrapResponse(response.data);
  },

  async markConversationAsRead(conversationId: string): Promise<boolean> {
    const response = await apiClient.post<BackendResponse<boolean>>(
      `/api/Converstation/conversations/${conversationId}/read`
    );
    return unwrapResponse(response.data);
  },

  // Typing Status
  async getTypingStatus(conversationId: string): Promise<any[]> {
    const response = await apiClient.get<BackendResponse<any[]>>(
      `/api/Converstation/conversations/${conversationId}/typing`
    );
    return unwrapResponse(response.data);
  },

  // Reaction APIs
  async addReaction(dto: AddReactionDto): Promise<MessageReactionDto> {
    console.log('📤 Adding reaction:', dto);
    try {
      const response = await apiClient.post<BackendResponse<MessageReactionDto>>(
        '/api/Converstation/messages/reactions',
        dto
      );
      console.log('✅ Reaction added:', response.data);
      return unwrapResponse(response.data);
    } catch (error: any) {
      console.error('❌ Add reaction error:', error);
      throw error;
    }
  },

  async removeReaction(dto: RemoveReactionDto): Promise<boolean> {
    console.log('📤 Removing reaction:', dto);
    try {
      const response = await apiClient.delete<BackendResponse<boolean>>(
        '/api/Converstation/messages/reactions',
        { data: dto }
      );
      console.log('✅ Reaction removed:', response.data);
      return unwrapResponse(response.data);
    } catch (error: any) {
      console.error('❌ Remove reaction error:', error);
      throw error;
    }
  },

  async getMessageReactions(messageId: string): Promise<ReactionSummary[]> {
    console.log('📤 Getting message reactions:', messageId);
    try {
      const response = await apiClient.get<BackendResponse<ReactionSummary[]>>(
        `/api/Converstation/messages/${messageId}/reactions`
      );
      console.log('✅ Message reactions:', response.data);
      return unwrapResponse(response.data);
    } catch (error: any) {
      console.error('❌ Get message reactions error:', error);
      throw error;
    }
  },
};


