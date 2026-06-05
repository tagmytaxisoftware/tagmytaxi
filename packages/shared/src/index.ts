/**
 * @fileoverview Public API of the @tagmytaxi/shared package.
 * All types, interfaces, constants, and utilities used across the monorepo
 * are re-exported from this single entry point.
 * @module @tagmytaxi/shared
 */

// Types
export type { TenantId, RideId, DriverId, PassengerId, TransactionId, ISODateString, Result, PaginationParams, PaginatedResult, ApiError, E164Phone, CurrencyCode } from './types/common';
export type { Coordinate, NamedLocation, LocationUpdate, ETAResult, Zone } from './types/location';
export type { RideStatus, CancellationActor, RideRequest, Ride, RideDetails } from './types/ride';
export type { DriverStatus, VerificationStatus, Driver, Vehicle, Assignment, DriverLiveState } from './types/driver';
export type { FareBreakdown, FareEstimate, PaymentGateway, PaymentDetails, PaymentResult, RefundResult, PricingRule } from './types/billing';
export type { Role, AuthUser, JWTPayload, AuthTokens, LoginRequest, OAuthProvider, OAuthCallbackPayload, PasswordResetRequest, PasswordResetCompletion, AuthAuditEntry } from './types/auth';
export { Permission } from './types/auth';
export type { MapProvider, PaymentGatewayId, NotificationChannel, TenantFeatureFlags, TenantSLATargets, TenantRBACConfig, TenantConfig } from './types/tenant';
export type { Passenger, SavedPlace, PaymentMethod, RideRating } from './types/passenger';

// Interfaces
export type { IMatchingService } from './interfaces/IMatchingService';
export type { ITrackingService, LocationUpdateCallback, Unsubscribe } from './interfaces/ITrackingService';
export type { IBillingService } from './interfaces/IBillingService';
export type { INotificationService, NotificationPayload, NotificationResult } from './interfaces/INotificationService';
export type { ICacheService } from './interfaces/ICacheService';

// Constants
export { ErrorCode } from './constants/errorCodes';
export { RIDE_STATUS_TRANSITIONS, TERMINAL_RIDE_STATUSES, isValidTransition, isTerminalStatus } from './constants/rideStatus';

// Utilities
export { haversineDistance, bearing, destinationPoint, isWithinRadius, isValidCoordinate } from './utils/coordinates';
export { formatCurrency, convertCurrency, getCurrencyDecimals } from './utils/currency';
export { isValidE164Phone, isValidUUID, isValidEmail, clamp } from './utils/validation';
