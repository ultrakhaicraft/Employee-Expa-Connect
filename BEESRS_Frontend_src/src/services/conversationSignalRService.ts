// src/services/conversationSignalRService.ts
import * as signalR from '@microsoft/signalr';
import type {
  MessageDto,
  SendMessageDto,
  EditMessageDto,
  ConversationDto,
  ParticipantDto,
} from '../types/conversation.types';
import { store } from '../redux/store';

type MessageHandler = (message: MessageDto) => void;
type ConversationHandler = (conversation: ConversationDto) => void;
type TypingHandler = (conversationId: string, userId: string, isTyping: boolean) => void;
type ReadHandler = (conversationId: string, messageId: string | null, userId: string) => void;
type ParticipantHandler = (conversationId: string, participant: ParticipantDto) => void;
type ParticipantRemovedHandler = (conversationId: string, userId: string) => void;
type ConversationDeletedHandler = (conversationId: string) => void;
type ErrorHandler = (error: string) => void;
type VideoCallOfferHandler = (offer: RTCSessionDescriptionInit, fromUserId: string) => void;
type VideoCallAnswerHandler = (answer: RTCSessionDescriptionInit) => void;
type IceCandidateHandler = (candidate: RTCIceCandidateInit, fromUserId: string) => void;
type VideoCallIncomingHandler = (fromUserId: string, fromUserName: string) => void;
type VideoCallEndedHandler = (userId: string) => void;
type AudioCallOfferHandler = (offer: RTCSessionDescriptionInit, fromUserId: string) => void;
type AudioCallAnswerHandler = (answer: RTCSessionDescriptionInit) => void;
type AudioCallIncomingHandler = (fromUserId: string, fromUserName: string) => void;
type AudioCallEndedHandler = (userId: string) => void;

class ConversationSignalRService {
  private connection: signalR.HubConnection | null = null;
  private stateMonitorInterval: NodeJS.Timeout | null = null;
  private messageHandlers: MessageHandler[] = [];
  private messageEditedHandlers: MessageHandler[] = [];
  private messageDeletedHandlers: ((conversationId: string, messageId: string) => void)[] = [];
  private conversationCreatedHandlers: ConversationHandler[] = [];
  private conversationUpdatedHandlers: ConversationHandler[] = [];
  private conversationDeletedHandlers: ConversationDeletedHandler[] = [];
  private typingHandlers: TypingHandler[] = [];
  private readHandlers: ReadHandler[] = [];
  private participantAddedHandlers: ParticipantHandler[] = [];
  private participantRemovedHandlers: ParticipantRemovedHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  // Video Call Handlers
  private videoCallOfferHandlers: VideoCallOfferHandler[] = [];
  private videoCallAnswerHandlers: VideoCallAnswerHandler[] = [];
  private videoCallIceCandidateHandlers: IceCandidateHandler[] = [];
  private videoCallIncomingHandlers: VideoCallIncomingHandler[] = [];
  private videoCallEndedHandlers: VideoCallEndedHandler[] = [];
  // Audio Call Handlers
  private audioCallOfferHandlers: AudioCallOfferHandler[] = [];
  private audioCallAnswerHandlers: AudioCallAnswerHandler[] = [];
  private audioCallIncomingHandlers: AudioCallIncomingHandler[] = [];
  private audioCallEndedHandlers: AudioCallEndedHandler[] = [];

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      console.log('ConversationHub already connected');
      return;
    }

    // Get token from Redux store
    const state = store.getState() as any;
    const token = state?.auth?.accessToken;

    if (!token) {
      throw new Error('No authentication token found');
    }

    const hubUrl = import.meta.env.VITE_SIGNALR_CONVERSTATION_URL || `${import.meta.env.VITE_API_BASE_URL}/hubs/converstation`;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff: 2s, 4s, 8s, 16s, 30s (max)
          return Math.min(2000 * Math.pow(2, retryContext.previousRetryCount), 30000);
        },
      })
      .withServerTimeout(60000) // 60 seconds - match backend ClientTimeoutInterval
      .withKeepAliveInterval(15000) // 15 seconds - match backend KeepAliveInterval
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupEventHandlers();

    try {
      await this.connection.start();
      console.log('ConversationHub connected successfully');
    } catch (error) {
      console.error('ConversationHub connection error:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.connection) return;

    // Message Events
    this.connection.on('ReceiveMessage', (message: MessageDto) => {
      console.log('📨 ReceiveMessage:', message);
      this.messageHandlers.forEach((handler) => handler(message));
    });

    this.connection.on('MessageEdited', (message: MessageDto) => {
      console.log('✏️ MessageEdited:', message);
      this.messageEditedHandlers.forEach((handler) => handler(message));
    });

    this.connection.on('MessageDeleted', (conversationId: string, messageId: string) => {
      console.log('🗑️ MessageDeleted:', conversationId, messageId);
      this.messageDeletedHandlers.forEach((handler) => handler(conversationId, messageId));
    });

    // Conversation Events
    this.connection.on('ConversationCreated', (conversation: ConversationDto) => {
      console.log('🆕 ConversationCreated:', conversation);
      this.conversationCreatedHandlers.forEach((handler) => handler(conversation));
    });

    this.connection.on('AddedToConversation', (conversation: ConversationDto) => {
      console.log('➕ AddedToConversation:', conversation);
      this.conversationCreatedHandlers.forEach((handler) => handler(conversation));
    });

    this.connection.on('ConversationUpdated', (conversation: ConversationDto) => {
      console.log('🔄 ConversationUpdated:', conversation);
      this.conversationUpdatedHandlers.forEach((handler) => handler(conversation));
    });

    this.connection.on('ConversationDeleted', (conversationId: string) => {
      console.log('❌ ConversationDeleted:', conversationId);
      this.conversationDeletedHandlers.forEach((handler) => handler(conversationId));
    });

    this.connection.on('RemovedFromConversation', (conversationId: string) => {
      console.log('👋 RemovedFromConversation:', conversationId);
      this.conversationDeletedHandlers.forEach((handler) => handler(conversationId));
    });

    // Participant Events
    this.connection.on('ParticipantAdded', (conversationId: string, participant: ParticipantDto) => {
      console.log('👤 ParticipantAdded:', conversationId, participant);
      this.participantAddedHandlers.forEach((handler) => handler(conversationId, participant));
    });

    this.connection.on('ParticipantRemoved', (conversationId: string, userId: string) => {
      console.log('👤❌ ParticipantRemoved:', conversationId, userId);
      this.participantRemovedHandlers.forEach((handler) => handler(conversationId, userId));
    });

    // Typing Indicator
    this.connection.on('UserTyping', (conversationId: string, userId: string, isTyping: boolean) => {
      console.log('⌨️ UserTyping:', conversationId, userId, isTyping);
      this.typingHandlers.forEach((handler) => handler(conversationId, userId, isTyping));
    });

    // Read Receipts
    this.connection.on('MessageRead', (conversationId: string, messageId: string | null, userId: string) => {
      console.log('👁️ MessageRead:', conversationId, messageId, userId);
      this.readHandlers.forEach((handler) => handler(conversationId, messageId, userId));
    });

    this.connection.on('ConversationRead', (conversationId: string, userId: string) => {
      console.log('👁️ ConversationRead:', conversationId, userId);
      this.readHandlers.forEach((handler) => handler(conversationId, null, userId));
    });

    // Error Handling
    this.connection.on('Error', (error: string) => {
      console.error('❗ SignalR Error:', error);
      this.errorHandlers.forEach((handler) => handler(error));
    });

    // Connection State Events
    this.connection.onreconnecting((error) => {
      console.log('🔄 ConversationHub reconnecting...', error);
      console.log('🔄 Current connection state:', this.connection?.state);
    });

    this.connection.onreconnected((connectionId) => {
      console.log('✅ ConversationHub reconnected', connectionId);
      console.log('✅ Connection state after reconnect:', this.connection?.state);
    });

    // Monitor connection state changes (for debugging)
    let lastState = this.connection.state;
    if (this.stateMonitorInterval) {
      clearInterval(this.stateMonitorInterval);
    }
    this.stateMonitorInterval = setInterval(() => {
      if (this.connection && this.connection.state !== lastState) {
        console.log(`🔄 Connection state changed: ${lastState} -> ${this.connection.state}`);
        lastState = this.connection.state;
      }
      if (!this.connection) {
        if (this.stateMonitorInterval) {
          clearInterval(this.stateMonitorInterval);
          this.stateMonitorInterval = null;
        }
      }
    }, 2000); // Check every 2 seconds

    this.connection.onclose((error) => {
      if (error) {
        console.error('🔌 ConversationHub connection closed with error:', error);
        // If it's a timeout error, try to reconnect
        if (error.message?.includes('timeout') || error.message?.includes('Server timeout')) {
          console.log('⏱️ Timeout detected, will attempt to reconnect...');
          // Automatic reconnect should handle this, but we log it
        }
        // Log connection state for debugging
        console.log('🔌 Connection state on close:', this.connection?.state);
      } else {
        console.log('🔌 ConversationHub connection closed normally');
      }
    });

    // Video Call Events
    this.connection.on('VideoCallIncoming', (fromUserId: string, fromUserName: string) => {
      console.log('📞 VideoCallIncoming:', fromUserId, fromUserName);
      this.videoCallIncomingHandlers.forEach((handler) => handler(fromUserId, fromUserName));
    });

    this.connection.on('VideoCallOffer', (offer: any, fromUserId: string) => {
      console.log('📞 VideoCallOffer:', fromUserId);
      this.videoCallOfferHandlers.forEach((handler) => handler(offer, fromUserId));
    });

    this.connection.on('VideoCallAnswer', (answer: any) => {
      console.log('✅ VideoCallAnswer received');
      this.videoCallAnswerHandlers.forEach((handler) => handler(answer));
    });

    this.connection.on('IceCandidate', (candidate: any, fromUserId: string) => {
      console.log('🧊 IceCandidate:', fromUserId);
      this.videoCallIceCandidateHandlers.forEach((handler) => handler(candidate, fromUserId));
    });

    this.connection.on('VideoCallEnded', (userId: string) => {
      console.log('📴 VideoCallEnded:', userId);
      this.videoCallEndedHandlers.forEach((handler) => handler(userId));
    });

    // Audio Call Events
    this.connection.on('AudioCallIncoming', (fromUserId: string, fromUserName: string) => {
      console.log('📞 AudioCallIncoming:', fromUserId, fromUserName);
      this.audioCallIncomingHandlers.forEach((handler) => handler(fromUserId, fromUserName));
    });

    this.connection.on('AudioCallOffer', (offer: any, fromUserId: string) => {
      console.log('📞 AudioCallOffer:', fromUserId);
      this.audioCallOfferHandlers.forEach((handler) => handler(offer, fromUserId));
    });

    this.connection.on('AudioCallAnswer', (answer: any) => {
      console.log('✅ AudioCallAnswer received');
      this.audioCallAnswerHandlers.forEach((handler) => handler(answer));
    });

    this.connection.on('AudioCallEnded', (userId: string) => {
      console.log('📴 AudioCallEnded:', userId);
      this.audioCallEndedHandlers.forEach((handler) => handler(userId));
    });
  }

  async disconnect(): Promise<void> {
    if (this.stateMonitorInterval) {
      clearInterval(this.stateMonitorInterval);
      this.stateMonitorInterval = null;
    }
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      console.log('ConversationHub disconnected');
    }
  }

  // Hub Methods
  async joinConversation(conversationId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('JoinConversation', conversationId);
      console.log('Joined conversation:', conversationId);
    }
  }

  async leaveConversation(conversationId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('LeaveConversation', conversationId);
      console.log('Left conversation:', conversationId);
    }
  }

  async sendMessage(dto: SendMessageDto): Promise<void> {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) {
      throw new Error('ConversationHub not connected');
    }
    await this.connection.invoke('SendMessage', dto);
  }

  async editMessage(dto: EditMessageDto): Promise<void> {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) {
      throw new Error('ConversationHub not connected');
    }
    await this.connection.invoke('EditMessage', dto);
  }

  async deleteMessage(messageId: string, conversationId: string): Promise<void> {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) {
      throw new Error('ConversationHub not connected');
    }
    await this.connection.invoke('DeleteMessage', messageId, conversationId);
  }

  async sendTyping(conversationId: string, isTyping: boolean): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('Typing', conversationId, isTyping);
    }
  }

  async markAsRead(conversationId: string, messageId?: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('MarkAsRead', conversationId, messageId || null);
    }
  }

  // Helper method to ensure connection and retry if needed
  // Optimized for faster connection establishment
  // Public method to allow hooks to ensure connection before operations
  async ensureConnection(maxRetries = 2): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    // If already connecting, wait a bit instead of retrying immediately
    if (this.connection?.state === signalR.HubConnectionState.Connecting) {
      let waitCount = 0;
      const maxWait = 10; // Maximum 500ms wait (10 * 50ms)
      while (this.connection?.state === signalR.HubConnectionState.Connecting && waitCount < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 100ms
        waitCount++;
      }
      if (this.isConnected) {
        return;
      }
    }

    // Try to reconnect with reduced retries and faster delays
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`🔄 Attempting to reconnect ConversationHub (attempt ${i + 1}/${maxRetries})...`);
        await this.connect();
        // Reduced wait time for faster response
        await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 100ms
        if (this.isConnected) {
          console.log('✅ ConversationHub reconnected successfully');
          return;
        }
      } catch (error) {
        console.error(`❌ Reconnection attempt ${i + 1} failed:`, error);
        if (i < maxRetries - 1) {
          // Reduced exponential backoff for faster retry
          await new Promise(resolve => setTimeout(resolve, 200 * (i + 1))); // Reduced from 1000ms
        }
      }
    }

    throw new Error('ConversationHub not connected and reconnection failed');
  }

  // Video Call Methods
  async startVideoCall(conversationId: string, toUserId: string): Promise<void> {
    await this.ensureConnection();
    try {
      await this.connection!.invoke('StartVideoCall', conversationId, toUserId);
      console.log('📞 Started video call to:', toUserId);
    } catch (error) {
      console.error('❌ Error starting video call:', error);
      throw error;
    }
  }

  async sendVideoCallOffer(conversationId: string, toUserId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    await this.ensureConnection();
    try {
      await this.connection!.invoke('SendVideoCallOffer', conversationId, toUserId, offer);
      console.log('📞 Sent video call offer to:', toUserId);
    } catch (error) {
      console.error('❌ Error sending video call offer:', error);
      throw error;
    }
  }

  async sendVideoCallAnswer(conversationId: string, toUserId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    await this.ensureConnection();
    try {
      await this.connection!.invoke('SendVideoCallAnswer', conversationId, toUserId, answer);
      console.log('✅ Sent video call answer to:', toUserId);
    } catch (error) {
      console.error('❌ Error sending video call answer:', error);
      throw error;
    }
  }

  async sendIceCandidate(conversationId: string, toUserId: string, candidate: RTCIceCandidateInit): Promise<void> {
    // ICE candidates are sent frequently, so we don't want to block on connection issues
    // Just log and continue if connection is not ready
    if (this.connection?.state !== signalR.HubConnectionState.Connected) {
      console.warn('⚠️ Cannot send ICE candidate: ConversationHub not connected');
      return;
    }
    try {
      await this.connection.invoke('SendIceCandidate', conversationId, toUserId, candidate);
    } catch (error) {
      console.error('❌ Error sending ICE candidate:', error);
      // Don't throw - ICE candidates are not critical if one fails
    }
  }

  async endVideoCall(conversationId: string, toUserId: string): Promise<void> {
    // Send immediately if connected, don't wait for connection
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      // Fire and forget - don't await to avoid blocking
      this.connection.invoke('EndVideoCall', conversationId, toUserId)
        .catch(error => console.error('❌ Error ending video call:', error));
    } else {
      console.warn('⚠️ Cannot end video call: SignalR not connected');
    }
  }

  // Audio Call Methods
  async startAudioCall(conversationId: string, toUserId: string): Promise<void> {
    await this.ensureConnection();
    try {
      await this.connection!.invoke('StartAudioCall', conversationId, toUserId);
      console.log('📞 Started audio call to:', toUserId);
    } catch (error) {
      console.error('❌ Error starting audio call:', error);
      throw error;
    }
  }

  async sendAudioCallOffer(conversationId: string, toUserId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    await this.ensureConnection();
    try {
      await this.connection!.invoke('SendAudioCallOffer', conversationId, toUserId, offer);
      console.log('📞 Sent audio call offer to:', toUserId);
    } catch (error) {
      console.error('❌ Error sending audio call offer:', error);
      throw error;
    }
  }

  async sendAudioCallAnswer(conversationId: string, toUserId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    await this.ensureConnection();
    try {
      await this.connection!.invoke('SendAudioCallAnswer', conversationId, toUserId, answer);
      console.log('✅ Sent audio call answer to:', toUserId);
    } catch (error) {
      console.error('❌ Error sending audio call answer:', error);
      throw error;
    }
  }

  async endAudioCall(conversationId: string, toUserId: string): Promise<void> {
    // Send immediately if connected, don't wait for connection
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      // Fire and forget - don't await to avoid blocking
      this.connection.invoke('EndAudioCall', conversationId, toUserId)
        .catch(error => console.error('❌ Error ending audio call:', error));
    } else {
      console.warn('⚠️ Cannot end audio call: SignalR not connected');
    }
  }

  // Event Subscriptions
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  onMessageEdited(handler: MessageHandler): () => void {
    this.messageEditedHandlers.push(handler);
    return () => {
      this.messageEditedHandlers = this.messageEditedHandlers.filter((h) => h !== handler);
    };
  }

  onMessageDeleted(handler: (conversationId: string, messageId: string) => void): () => void {
    this.messageDeletedHandlers.push(handler);
    return () => {
      this.messageDeletedHandlers = this.messageDeletedHandlers.filter((h) => h !== handler);
    };
  }

  onConversationCreated(handler: ConversationHandler): () => void {
    this.conversationCreatedHandlers.push(handler);
    return () => {
      this.conversationCreatedHandlers = this.conversationCreatedHandlers.filter((h) => h !== handler);
    };
  }

  onConversationUpdated(handler: ConversationHandler): () => void {
    this.conversationUpdatedHandlers.push(handler);
    return () => {
      this.conversationUpdatedHandlers = this.conversationUpdatedHandlers.filter((h) => h !== handler);
    };
  }

  onConversationDeleted(handler: ConversationDeletedHandler): () => void {
    this.conversationDeletedHandlers.push(handler);
    return () => {
      this.conversationDeletedHandlers = this.conversationDeletedHandlers.filter((h) => h !== handler);
    };
  }

  onTyping(handler: TypingHandler): () => void {
    this.typingHandlers.push(handler);
    return () => {
      this.typingHandlers = this.typingHandlers.filter((h) => h !== handler);
    };
  }

  onRead(handler: ReadHandler): () => void {
    this.readHandlers.push(handler);
    return () => {
      this.readHandlers = this.readHandlers.filter((h) => h !== handler);
    };
  }

  onParticipantAdded(handler: ParticipantHandler): () => void {
    this.participantAddedHandlers.push(handler);
    return () => {
      this.participantAddedHandlers = this.participantAddedHandlers.filter((h) => h !== handler);
    };
  }

  onParticipantRemoved(handler: ParticipantRemovedHandler): () => void {
    this.participantRemovedHandlers.push(handler);
    return () => {
      this.participantRemovedHandlers = this.participantRemovedHandlers.filter((h) => h !== handler);
    };
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.push(handler);
    return () => {
      this.errorHandlers = this.errorHandlers.filter((h) => h !== handler);
    };
  }

  // Video Call Event Subscriptions
  onVideoCallIncoming(handler: VideoCallIncomingHandler): () => void {
    this.videoCallIncomingHandlers.push(handler);
    return () => {
      this.videoCallIncomingHandlers = this.videoCallIncomingHandlers.filter((h) => h !== handler);
    };
  }

  onVideoCallOffer(handler: VideoCallOfferHandler): () => void {
    this.videoCallOfferHandlers.push(handler);
    return () => {
      this.videoCallOfferHandlers = this.videoCallOfferHandlers.filter((h) => h !== handler);
    };
  }

  onVideoCallAnswer(handler: VideoCallAnswerHandler): () => void {
    this.videoCallAnswerHandlers.push(handler);
    return () => {
      this.videoCallAnswerHandlers = this.videoCallAnswerHandlers.filter((h) => h !== handler);
    };
  }

  onIceCandidate(handler: IceCandidateHandler): () => void {
    this.videoCallIceCandidateHandlers.push(handler);
    return () => {
      this.videoCallIceCandidateHandlers = this.videoCallIceCandidateHandlers.filter((h) => h !== handler);
    };
  }

  onVideoCallEnded(handler: VideoCallEndedHandler): () => void {
    this.videoCallEndedHandlers.push(handler);
    return () => {
      this.videoCallEndedHandlers = this.videoCallEndedHandlers.filter((h) => h !== handler);
    };
  }

  // Audio Call Event Subscriptions
  onAudioCallIncoming(handler: AudioCallIncomingHandler): () => void {
    this.audioCallIncomingHandlers.push(handler);
    return () => {
      this.audioCallIncomingHandlers = this.audioCallIncomingHandlers.filter((h) => h !== handler);
    };
  }

  onAudioCallOffer(handler: AudioCallOfferHandler): () => void {
    this.audioCallOfferHandlers.push(handler);
    return () => {
      this.audioCallOfferHandlers = this.audioCallOfferHandlers.filter((h) => h !== handler);
    };
  }

  onAudioCallAnswer(handler: AudioCallAnswerHandler): () => void {
    this.audioCallAnswerHandlers.push(handler);
    return () => {
      this.audioCallAnswerHandlers = this.audioCallAnswerHandlers.filter((h) => h !== handler);
    };
  }

  onAudioCallEnded(handler: AudioCallEndedHandler): () => void {
    this.audioCallEndedHandlers.push(handler);
    return () => {
      this.audioCallEndedHandlers = this.audioCallEndedHandlers.filter((h) => h !== handler);
    };
  }

  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  get connectionState(): signalR.HubConnectionState | null {
    return this.connection?.state ?? null;
  }
}

export const conversationSignalRService = new ConversationSignalRService();


