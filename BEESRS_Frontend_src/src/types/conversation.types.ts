// src/types/conversation.types.ts
// Types matching backend DTOs for real-time user-to-user conversations

// API Response wrapper
export interface ApiResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T;
  errors: string[];
  timestamp: string;
  traceId: string;
}

export interface CreateConversationDto {
  conversationType: 'direct' | 'group';
  conversationName?: string;
  conversationAvatar?: string;
  participantIds: string[];
}

export interface UpdateConversationDto {
  conversationName?: string;
  conversationAvatar?: string;
}

export interface SendMessageDto {
  conversationId: string;
  messageType: 'text' | 'image' | 'file' | 'video' | 'audio' | 'location';
  messageContent?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  thumbnailUrl?: string;
  duration?: number;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  replyToMessageId?: string;
}

export interface EditMessageDto {
  messageId: string;
  messageContent: string;
}

// Reaction types
export interface MessageReactionDto {
  reactionId: string;
  messageId: string;
  userId: string;
  userName: string;
  reactionType: ReactionType;
  createdAt: string;
}

export interface AddReactionDto {
  messageId: string;
  reactionType: ReactionType;
}

export interface RemoveReactionDto {
  messageId: string;
  reactionType: ReactionType;
}

export type ReactionType = 
  | 'like' 
  | 'love' 
  | 'laugh' 
  | 'wow' 
  | 'sad' 
  | 'angry' 
  | 'thumbs_up' 
  | 'thumbs_down'
  | 'heart'
  | 'fire'
  | 'clap'
  | 'party';

export interface ReactionSummary {
  reactionType: ReactionType;
  count: number;
  users: string[];
  hasCurrentUser: boolean;
}

export interface AddParticipantsDto {
  userIds: string[];
}

export interface UpdateParticipantRoleDto {
  role: 'admin' | 'member';
}

export interface MarkAsReadDto {
  conversationId: string;
  messageId?: string;
}

export interface TypingIndicatorDto {
  conversationId: string;
  isTyping: boolean;
}

// Response DTOs
export interface ParticipantDto {
  participantId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  role: 'admin' | 'member';
  joinedAt: string;
  leftAt?: string;
  isActive: boolean;
  lastReadAt?: string;
  notificationEnabled: boolean;
  nickname?: string;
  isOnline: boolean;
}

export interface ReadReceiptDto {
  userId: string;
  userName: string;
  readAt: string;
}

export interface MessageDto {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  messageType: 'text' | 'image' | 'file' | 'video' | 'audio' | 'location';
  messageContent?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  thumbnailUrl?: string;
  duration?: number;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  replyToMessageId?: string;
  replyToMessage?: MessageDto;
  isEdited: boolean;
  reactions?: ReactionSummary[];
  isDeleted: boolean;
  editedAt?: string;
  createdAt: string;
  readReceipts: ReadReceiptDto[];
  isRead: boolean;
}

export interface ConversationDto {
  conversationId: string;
  conversationType: 'direct' | 'group' | 'event';
  conversationName?: string;
  conversationAvatar?: string;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  participants: ParticipantDto[];
  lastMessage?: MessageDto;
  unreadCount: number;
}

export interface TypingStatusDto {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  startedAt: string;
}

export interface ConversationListDto {
  conversations: ConversationDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface MessageListDto {
  messages: MessageDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  hasMore: boolean;
}

// Additional helper types
export interface ConversationState {
  conversations: ConversationDto[];
  currentConversation: ConversationDto | null;
  messages: { [conversationId: string]: MessageDto[] };
  typingUsers: { [conversationId: string]: TypingStatusDto[] };
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}



