/**
 * @fileoverview Authentication and RBAC types for the TagMyTaxi platform.
 * @module @tagmytaxi/shared/types/auth
 */

import type { E164Phone, ISODateString, TenantId } from './common';

/**
 * All roles available in the platform RBAC model.
 * Roles are hierarchical — higher roles inherit lower-role permissions.
 */
export type Role =
  | 'PASSENGER'
  | 'DRIVER'
  | 'DISPATCHER'
  | 'FLEET_MANAGER'
  | 'ADMIN'
  | 'SUPER_ADMIN';

/**
 * Fine-grained permissions controlled by RBAC policies.
 * Convention: RESOURCE_ACTION.
 */
export enum Permission {
  // Ride permissions
  RIDE_CREATE = 'ride:create',
  RIDE_READ = 'ride:read',
  RIDE_CANCEL = 'ride:cancel',
  RIDE_MANAGE = 'ride:manage',

  // Driver permissions
  DRIVER_READ = 'driver:read',
  DRIVER_MANAGE = 'driver:manage',
  DRIVER_SUSPEND = 'driver:suspend',

  // Billing permissions
  BILLING_VIEW = 'billing:view',
  BILLING_REFUND = 'billing:refund',
  BILLING_PRICING_MANAGE = 'billing:pricing:manage',

  // Fleet permissions
  FLEET_VIEW = 'fleet:view',
  FLEET_MANAGE = 'fleet:manage',

  // Analytics permissions
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',

  // Admin permissions
  ADMIN_USERS_MANAGE = 'admin:users:manage',
  ADMIN_CONFIG_MANAGE = 'admin:config:manage',
  ADMIN_FULL = 'admin:full',
}

/**
 * Authenticated user context attached to every API request by the auth middleware.
 */
export interface AuthUser {
  readonly userId: string;
  readonly tenantId: TenantId;
  readonly email: string;
  readonly phone?: E164Phone;
  readonly role: Role;
  readonly permissions: ReadonlyArray<Permission>;
}

/**
 * Shape of the JWT payload issued by the auth service.
 */
export interface JWTPayload {
  /** Subject — maps to userId */
  readonly sub: string;
  readonly tenantId: TenantId;
  readonly email: string;
  readonly role: Role;
  readonly permissions: ReadonlyArray<Permission>;
  /** Issued at (Unix timestamp) */
  readonly iat: number;
  /** Expiry (Unix timestamp) */
  readonly exp: number;
  /** JWT ID — used for token revocation */
  readonly jti: string;
}

/**
 * Tokens returned on successful login or refresh.
 */
export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
  readonly tokenType: 'Bearer';
}

/**
 * Login request body.
 */
export interface LoginRequest {
  readonly email: string;
  readonly password: string;
  readonly tenantId?: TenantId;
}

/**
 * OAuth 2.0 provider identifiers supported for social login.
 */
export type OAuthProvider = 'google' | 'apple' | 'facebook';

/**
 * Inbound OAuth callback payload after provider authentication.
 */
export interface OAuthCallbackPayload {
  readonly provider: OAuthProvider;
  readonly code: string;
  readonly state: string;
  readonly tenantId: TenantId;
}

/**
 * Password reset request.
 */
export interface PasswordResetRequest {
  readonly email: string;
  readonly tenantId: TenantId;
  readonly redirectUrl: string;
}

/**
 * Password reset completion.
 */
export interface PasswordResetCompletion {
  readonly token: string;
  readonly newPassword: string;
}

/**
 * Audit log entry for authentication events.
 */
export interface AuthAuditEntry {
  readonly userId: string;
  readonly tenantId: TenantId;
  readonly event:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'TOKEN_REFRESH'
    | 'PASSWORD_RESET'
    | 'ACCOUNT_LOCKED';
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly timestamp: ISODateString;
}
