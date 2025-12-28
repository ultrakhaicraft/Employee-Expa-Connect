// src/types/chat.types.ts
export interface ChatMessage {
  messageId: string;
  conversationId: string;
  senderType: 'user' | 'assistant';
  messageText: string;
  messageType?: 'text' | 'image' | 'video' | 'location';
  mediaUrl?: string;
  mediaThumbnailUrl?: string;
  mediaFileName?: string;
  mediaFileSize?: number;
  mediaMimeType?: string;
  mediaDuration?: number;
  location?: UserLocation;
  locationName?: string;
  botResponseType?: string;
  detectedIntent?: string;
  aiConfidenceScore?: number;
  processingTimeMs?: number;
  referencedPlaces?: any; // JSON object
  createdAt: string;
}

export interface ChatMessageRequest {
  conversationId?: string;
  message: string;
  language?: string;
  location?: UserLocation;
}

export interface ChatMessageResponse {
  conversationId: string;
  messageId: string;
  response: string;
  intent: string;
  extractedEntities: ExtractedEntity[];
  suggestedActions: SuggestedAction[];
  places?: Place[];
  additionalData?: any;
  timestamp: string;
  processingTimeMs: number;
}

export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
}

export interface SuggestedAction {
  type: 'show_map' | 'get_directions' | 'create_event' | 'show_location' | 'open_map';
  label: string;
  data: Record<string, any>;
}

export interface Conversation {
  conversationId: string;
  title: string;
  conversationType: string;
  isActive: boolean;
  startedAt: string;
  lastActivityAt: string;
  messages: ChatMessage[];
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;
  category: string;
  distanceText: string;
  durationText: string;
  averageRating?: number;
  priceLevel?: number;
  phoneNumber?: string;
  websiteUrl?: string;
  isOpen?: boolean;
}

// Additional data structures from backend
export interface LocationSearchData {
  places: Place[];
  totalFound: number;
  searchQuery: string;
}

export interface EmergencyData {
  nearestPlace: Place;
  emergencyContacts: EmergencyContact[];
  instructions: string;
}

export interface EmergencyContact {
  name: string;
  phoneNumber: string;
  type: string;
}