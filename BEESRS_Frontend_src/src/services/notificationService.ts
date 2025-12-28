import { HubConnectionBuilder } from "@microsoft/signalr";
import * as signalR from '@microsoft/signalr';
import { store } from '../redux/store';
import type { PaginatedResponse } from "@/types/itinerary.types";
import apiClient from "@/utils/axios";
import type { NotificationDetailDto, NotificationViewDto, SearchParams } from "@/types/notifications.types";

//Handle system notification on high and basic level, using SignalR Hub
class NotificationService{
    private baseHubUrl: string;
    private connection: signalR.HubConnection | null = null;
    private connectingPromise: Promise<void> | null = null;
    private isDisconnecting: boolean = false;

    constructor() {
        this.baseHubUrl = import.meta.env.VITE_SIGNALR_GENERAL_URL || '';
        if (!this.baseHubUrl) {
            console.warn('VITE_SIGNALR_GENERAL_URL is not set in environment variables');
        }
    }

    async connect(): Promise<void> {
        // If already connected, return immediately
        if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
            console.log('SignalR already connected');
            return;
        }

        // If already connecting, wait for that promise
        if (this.connectingPromise) {
            console.log('Connection already in progress, waiting...');
            return this.connectingPromise;
        }

        // If disconnecting, wait a bit and retry
        if (this.isDisconnecting) {
            console.log('Disconnection in progress, waiting...');
            await new Promise(resolve => setTimeout(resolve, 100));
            return this.connect();
        }

        // Create a new connection promise
        this.connectingPromise = this._connectInternal();
        
        try {
            await this.connectingPromise;
        } finally {
            this.connectingPromise = null;
        }
    }

    private async _connectInternal(): Promise<void> {
        // Cleanup existing connection if it exists
        if (this.connection) {
            const currentState = this.connection.state;
            
            // If connection is in a transitional state, wait for it to settle
            if (currentState === signalR.HubConnectionState.Connecting || 
                currentState === signalR.HubConnectionState.Reconnecting) {
                console.log('Waiting for existing connection to settle...');
                // Wait a bit for the connection to either succeed or fail
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Check state again
                if (this.connection && 
                    (this.connection.state === signalR.HubConnectionState.Connecting || 
                     this.connection.state === signalR.HubConnectionState.Reconnecting)) {
                    // Still connecting, stop it
                    try {
                        await this.connection.stop();
                    } catch (error) {
                        // Ignore errors when stopping a connecting connection
                        console.warn('Error stopping connecting connection:', error);
                    }
                }
            } else if (currentState === signalR.HubConnectionState.Connected) {
                // Already connected, return
                console.log('SignalR already connected');
                return;
            } else if (currentState !== signalR.HubConnectionState.Disconnected) {
                // Stop if not already disconnected
                try {
                    await this.connection.stop();
                } catch (error) {
                    console.warn('Error stopping existing connection:', error);
                }
            }
            
            this.connection = null;
        }

        //Get token
        const state = store.getState() as any;
        const token = state?.auth?.accessToken;

        if (!token) {
            throw new Error('No authentication token found');
        }

        if (!this.baseHubUrl) {
            throw new Error('SignalR Hub URL is not configured. Please set VITE_SIGNALR_GENERAL_URL in environment variables');
        }

        //Build the connection
        const HubUrl=`${this.baseHubUrl}?access_token=${token}`;

        const newConnection = new HubConnectionBuilder()
            .withUrl(HubUrl,{
                skipNegotiation: true,
                transport: signalR.HttpTransportType.WebSockets,
            })
            .configureLogging(signalR.LogLevel.Information)
            .withAutomaticReconnect()
            .build();

        // Only assign if we're still supposed to connect (not cancelled)
        if (!this.isDisconnecting) {
            this.connection = newConnection;
            
            //Register listener for General (Hub) Notification
            this.registerConnectionHandlers();

            //Start the connection
            try {
                // Double-check we're not disconnecting before starting
                if (this.isDisconnecting) {
                    // Clean up and return silently
                    this.connection = null;
                    try {
                        await newConnection.stop();
                    } catch (error) {
                        // Ignore
                    }
                    return;
                }
                
                // Start the connection
                await this.connection.start();
                
                // Check again after start completes - if we were cancelled, cleanup
                if (this.isDisconnecting) {
                    // We were cancelled during start, stop the connection
                    if (this.connection === newConnection) {
                        try {
                            await this.connection.stop();
                        } catch (stopError) {
                            // Ignore stop errors
                        }
                        this.connection = null;
                    }
                    return; // Don't throw, just return silently
                }
                
                // Verify connection is still ours
                if (this.connection === newConnection && this.connection.state === signalR.HubConnectionState.Connected) {
                    console.log("✅ Connected to General Notification Hub!");
                }
            } catch (error: any) {
                // Check if error is due to disconnection during start
                const isAbortError = error?.name === 'AbortError' || 
                                   error?.message?.includes('stop() was called') ||
                                   this.isDisconnecting;
                
                if (!isAbortError) {
                    console.error("SignalR connection failed:", error);
                }
                
                // Only set to null if this is still our connection
                if (this.connection === newConnection) {
                    this.connection = null;
                }
                
                // Retry after delay, but only if we're not disconnecting and it's not an abort error
                if (!this.isDisconnecting && !isAbortError) {
                    setTimeout(() => {
                        if (!this.isDisconnecting && (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected)) {
                            this.connect().catch(err => {
                                // Only log non-abort errors
                                if (err?.name !== 'AbortError' && !err?.message?.includes('stop() was called')) {
                                    console.error("Retry connection failed:", err);
                                }
                            });
                        }
                    }, 5000);
                }
                
                // Only throw if not an abort error and not disconnecting
                if (!isAbortError && !this.isDisconnecting) {
                    throw error;
                }
            }
        } else {
            // We were cancelled, clean up the connection we just created
            try {
                await newConnection.stop();
            } catch (error) {
                // Ignore
            }
        }
    }

    async sendNotification(message: string, title: string, type: string = "info"): Promise<void> {
        if (!this.connection) {
            console.warn("SignalR not connected yet.");
            return;
        }
        await this.connection?.invoke('BoardcastNotification', title, message, type)
    }

    //Stop the connection
    async disconnect() {
        this.isDisconnecting = true;
        
        // Wait for any ongoing connection attempt to complete or cancel
        if (this.connectingPromise) {
            try {
                // Wait for the connection promise to settle (with timeout)
                await Promise.race([
                    this.connectingPromise.catch(() => {}), // Ignore errors
                    new Promise(resolve => setTimeout(resolve, 2000))
                ]);
            } catch (error) {
                // Ignore connection errors during disconnect
            }
        }

        if(this.connection) {
            try {
                const currentState = this.connection.state;
                
                // If connection is connecting, wait a bit for it to either succeed or fail
                if (currentState === signalR.HubConnectionState.Connecting) {
                    // Wait for connection to settle
                    let attempts = 0;
                    while (this.connection && 
                           this.connection.state === signalR.HubConnectionState.Connecting && 
                           attempts < 10) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        attempts++;
                    }
                }
                
                // Only stop if connection is not already stopped or stopping
                if (this.connection && 
                    this.connection.state !== signalR.HubConnectionState.Disconnected && 
                    this.connection.state !== signalR.HubConnectionState.Disconnecting) {
                    try {
                        await this.connection.stop();
                    } catch (error: any) {
                        // Ignore AbortError and similar errors during disconnect
                        if (error?.name !== 'AbortError' && !error?.message?.includes('stop() was called')) {
                            console.warn('Error disconnecting SignalR:', error);
                        }
                    }
                }
            } catch (error) {
                // Ignore errors during disconnect
            } finally {
                this.connection = null;
                console.log('General Hub disconnected');
            }
        }
        
        this.isDisconnecting = false;
    }

    private registerConnectionHandlers() {
        if (!this.connection) return;

        // Clean up any previous handlers to avoid duplicates
        this.connection.off("ReceiveNotification");
        
        // Register notification handler
        this.connection.on("ReceiveNotification", (notification) => {
            console.log("📢 Notification received:", notification);
        });

        // Note: onreconnecting, onreconnected, and onclose are already set up
        // by withAutomaticReconnect(), but we can add additional handlers if needed
        // These handlers are not duplicated because they're set once per connection instance
    }

    async getAllNotification (params?: SearchParams ): Promise<PaginatedResponse<NotificationViewDto>> {
        try {
            const response = await apiClient.get("/api/notifications/get-all", {
                params: params || {Page: 1, PageSize: 10}
            });

            const raw = response.data?.data;
            const page = params?.page ?? 1;
            const pageSize = params?.pageSize ?? 20;
            if (!raw) {
                return { page, pageSize, totalItems: 0, items: [] };
            }
            if (Array.isArray(raw)) {
                return { page, pageSize, totalItems: raw.length, items: raw };
            }
            return raw;
        } catch (error: any) {
            const page = params?.page ?? 1;
            const pageSize = params?.pageSize ?? 20;
            if (error?.response?.status === 404) {
                return { page, pageSize, totalItems: 0, items: [] };
            }
            console.error('Failed to load notifications:', error);
            throw error;
        }
    }

    async getUnreadCount (): Promise<number> {
        try {
            const response = await apiClient.get(`/api/notifications/unread-count`);
            return response.data?.data || 0;
        } catch (error: any) {
            if (error?.response?.status === 404) {
                console.warn('Unread count endpoint not found, returning 0');
                return 0;
            }
            console.error('Failed to get unread count:', error);
            return 0;
        }
    }

    async markAsRead (id:string): Promise<void> {
        await apiClient.patch(`/api/notifications/mark-as-read`, null, {
            params: {notificationId: id}
        });
    }

    async markAsDismissed (id:string): Promise<void> {
        await apiClient.patch(`/api/notifications/mark-as-dimissed`,{
            params: {notificationId: id}
        });
    }

    async deleteNotification (id:string): Promise<void> {
        await apiClient.delete(`/api/notifications`,{
            params: {notificationId: id}
        });
    }

    async getNotificationDetailById (id: string): Promise<NotificationDetailDto | null>  {
        try {
            const response = await apiClient.get(`/api/notifications/get-detail`,{
                params: {notificationId: id}
            });
            return response.data?.data ?? null;
        } catch (error: any) {
            if (error?.response?.status === 404) {
                return null;
            }
            console.error('Failed to fetch notification detail:', error);
            throw error;
        }
    };

}

const notificationService = new NotificationService();
export default notificationService;