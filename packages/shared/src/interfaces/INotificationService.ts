/**
 * @fileoverview Notification service interface.
 * Supports push (FCM), SMS (Twilio), and email channels.
 * @module @tagmytaxi/shared/interfaces
 */

import type { TenantId } from '../types/common';

export type NotificationChannel = 'push' | 'sms' | 'email';

export type NotificationPriority = 'low' | 'normal' | 'high';

export interface NotificationPayload {
  readonly tenantId: TenantId;
  readonly recipientId: string;
  readonly channels: ReadonlyArray<NotificationChannel>;
  readonly priority: NotificationPriority;
  readonly templateId: string;
  readonly templateData: Record<string, string>;
  /** Dedupe key — the same key within 60s will not send a duplicate */
  readonly idempotencyKey?: string;
}

export interface NotificationResult {
  readonly notificationId: string;
  readonly channelResults: ReadonlyArray<{
    readonly channel: NotificationChannel;
    readonly status: 'sent' | 'failed' | 'skipped';
    readonly providerMessageId?: string;
    readonly error?: string;
  }>;
  readonly sentAt: string;
}

/**
 * Contract for the multi-channel notification service.
 */
export interface INotificationService {
  /**
   * Sends a notification to a recipient via one or more channels.
   * Channel selection respects the tenant's `notificationChannels` config
   * and the recipient's communication preferences.
   *
   * @param payload - Notification parameters including template and recipient.
   * @returns Result for each channel attempted.
   */
  send(payload: NotificationPayload): Promise<NotificationResult>;

  /**
   * Sends a bulk notification to multiple recipients.
   * Internally batches FCM sends and respects Twilio rate limits.
   *
   * @param payloads - Array of notification payloads (max 500 per call).
   * @returns Results in the same order as the input array.
   */
  sendBatch(payloads: ReadonlyArray<NotificationPayload>): Promise<ReadonlyArray<NotificationResult>>;
}
