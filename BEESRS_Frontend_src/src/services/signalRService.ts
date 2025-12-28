// src/services/signalRService.ts
import * as signalR from '@microsoft/signalr';
import type{ ChatMessageResponse } from '../types/chat.types';
import { store } from '../redux/store';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private messageHandlers: ((message: ChatMessageResponse) => void)[] = [];
  private typingHandlers: ((isTyping: boolean) => void)[] = [];
  private errorHandlers: ((error: any) => void)[] = [];

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      console.log('SignalR already connected');
      return;
    }

    // Get token from Redux store
    const state = store.getState() as any;
    const token = state?.auth?.accessToken;

    if (!token) {
      throw new Error('No authentication token found');
    }

    const hubUrl = `${import.meta.env.VITE_SIGNALR_HUB_URL}?access_token=${token}`;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff
          return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
        },
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Set up event handlers
    this.connection.on('ReceiveMessage', (message: ChatMessageResponse) => {
      console.log('Received message:', message);
      this.messageHandlers.forEach((handler) => handler(message));
    });

    this.connection.on('TypingIndicator', (isTyping: boolean) => {
      this.typingHandlers.forEach((handler) => handler(isTyping));
    });

    this.connection.on('Error', (error: any) => {
      console.error('SignalR error:', error);
      this.errorHandlers.forEach((handler) => handler(error));
    });

    this.connection.onreconnecting(() => {
      console.log('SignalR reconnecting...');
    });

    this.connection.onreconnected(() => {
      console.log('SignalR reconnected');
    });

    this.connection.onclose((error) => {
      console.log('SignalR connection closed', error);
    });

    try {
      await this.connection.start();
      console.log('SignalR connected successfully');
    } catch (error) {
      console.error('SignalR connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      console.log('SignalR disconnected');
    }
  }

  async sendMessage(request: any): Promise<void> {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR not connected');
    }

    await this.connection.invoke('SendMessage', request);
  }

  async joinConversation(conversationId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('JoinConversation', conversationId);
    }
  }

  async leaveConversation(conversationId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('LeaveConversation', conversationId);
    }
  }

  onMessage(handler: (message: ChatMessageResponse) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  onTyping(handler: (isTyping: boolean) => void): () => void {
    this.typingHandlers.push(handler);
    return () => {
      this.typingHandlers = this.typingHandlers.filter((h) => h !== handler);
    };
  }

  onError(handler: (error: any) => void): () => void {
    this.errorHandlers.push(handler);
    return () => {
      this.errorHandlers = this.errorHandlers.filter((h) => h !== handler);
    };
  }

  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  get connectionState(): signalR.HubConnectionState | null {
    return this.connection?.state ?? null;
  }
}

export const signalRService = new SignalRService();