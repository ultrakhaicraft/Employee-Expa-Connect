export interface NotificationViewDto {
  notificationId: string;
  userId: string;
  notificationType?: string;
  title?: string;
  isRead: boolean;
  isDismissed: boolean;
  readAt?: string; // ISO date string
  createdAt: string; // ISO date string
  expiresAt?: string; // ISO date string
}

export interface SearchParams {
  page?: number;
  pageSize?: number;
  search?: string;   // email / name
  roleId?: number;   // filter by role
  isActive?: boolean;
}

export interface NotificationDetailDto {
  notificationId: string;
  userId: string;
  notificationType?: string;
  title?: string;
  message?: string;
  actionType?: string;
  actionData?: string; // JSON string
  deepLinkUrl?: string;
  isRead: boolean;
  isDismissed: boolean;
  readAt?: string;
  deliveryChannels?: string; // JSON string
  emailSentAt?: string;
  pushSentAt?: string;
  createdAt: string;
  expiresAt?: string;
}

