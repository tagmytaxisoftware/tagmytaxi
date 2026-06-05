/**
 * @fileoverview Multi-tenant configuration types.
 * This TypeScript interface is the compile-time mirror of tenant.config.schema.json.
 * @module @tagmytaxi/shared/types/tenant
 */

import type { CurrencyCode, TenantId } from './common';
import type { Role } from './auth';

/**
 * Map provider identifier.
 */
export type MapProvider = 'google' | 'mapbox' | 'here' | 'azure';

/**
 * Payment gateway identifiers enabled for this tenant.
 */
export type PaymentGatewayId = 'stripe' | 'paypal' | 'tap' | 'telr';

/**
 * Notification channel identifiers.
 */
export type NotificationChannel = 'push' | 'sms' | 'email' | 'whatsapp';

/**
 * Feature flags controlling optional platform capabilities per tenant.
 */
export interface TenantFeatureFlags {
  readonly scheduledRides: boolean;
  readonly rideSharing: boolean;
  readonly corporateAccounts: boolean;
  readonly loyaltyProgram: boolean;
  readonly surgeNotifications: boolean;
  readonly driverTipping: boolean;
  readonly rideTracking: boolean;
  readonly liveChat: boolean;
  readonly sos: boolean;
  readonly rideHistory: boolean;
  readonly receipts: boolean;
  readonly multipleStops: boolean;
}

/**
 * SLA targets configured per tenant, used by the matching and dispatch services.
 */
export interface TenantSLATargets {
  /** Maximum seconds allowed for driver assignment before the ride is re-dispatched */
  readonly driverAssignmentMaxSeconds: number;
  /** Minimum driver rating accepted for assignment (0–5) */
  readonly minimumDriverRating: number;
  /** Maximum search radius in km for initial driver lookup */
  readonly initialSearchRadiusKm: number;
  /** How many times to expand the search radius before failing */
  readonly maxSearchExpansions: number;
}

/**
 * RBAC configuration for this tenant.
 */
export interface TenantRBACConfig {
  readonly roles: ReadonlyArray<Role>;
  readonly customPermissions: ReadonlyArray<string>;
}

/**
 * Full tenant configuration object.
 * Loaded at service startup, validated against tenant.config.schema.json,
 * and cached in Redis with a 5-minute TTL.
 */
export interface TenantConfig {
  readonly tenantId: TenantId;
  readonly brandName: string;
  readonly primaryColor: string;
  readonly secondaryColor?: string;
  readonly logoUrl: string;
  readonly faviconUrl?: string;
  readonly supportedLocales: ReadonlyArray<string>;
  readonly defaultLocale: string;
  readonly currency: CurrencyCode;
  readonly timezone: string;
  readonly mapProvider: MapProvider;
  readonly enabledFeatures: TenantFeatureFlags;
  readonly paymentGateways: ReadonlyArray<PaymentGatewayId>;
  readonly vehicleCategories: ReadonlyArray<string>;
  readonly notificationChannels: ReadonlyArray<NotificationChannel>;
  readonly smsSenderId?: string;
  readonly firebaseProjectId?: string;
  readonly customDomain?: string;
  readonly supportEmail: string;
  readonly supportPhone?: string;
  readonly rbac: TenantRBACConfig;
  readonly slaTargets: TenantSLATargets;
  readonly isActive: boolean;
  readonly createdAt: string;
}
