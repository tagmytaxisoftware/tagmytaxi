/**
 * @fileoverview Passenger profile and preference types.
 * @module @tagmytaxi/shared/types/passenger
 */

import type { E164Phone, ISODateString, PassengerId, TenantId } from './common';

/**
 * Passenger profile as stored in the platform.
 */
export interface Passenger {
  readonly passengerId: PassengerId;
  readonly tenantId: TenantId;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: E164Phone;
  readonly profilePhotoUrl?: string;
  readonly rating: number;
  readonly totalRides: number;
  readonly preferredPaymentMethodId?: string;
  readonly loyaltyPoints?: number;
  readonly corporateAccountId?: string;
  readonly isActive: boolean;
  readonly createdAt: ISODateString;
}

/**
 * Saved place (home, work, favourite) linked to a passenger account.
 */
export interface SavedPlace {
  readonly placeId: string;
  readonly passengerId: PassengerId;
  readonly label: 'home' | 'work' | 'other';
  readonly name: string;
  readonly address: string;
  readonly lat: number;
  readonly lng: number;
  readonly createdAt: ISODateString;
}

/**
 * Passenger's saved payment method (tokenised reference only — no raw card data).
 */
export interface PaymentMethod {
  readonly paymentMethodId: string;
  readonly passengerId: PassengerId;
  readonly gateway: string;
  readonly type: 'card' | 'wallet' | 'cash';
  readonly last4?: string;
  readonly brand?: string;
  readonly expiryMonth?: number;
  readonly expiryYear?: number;
  readonly isDefault: boolean;
  readonly createdAt: ISODateString;
}

/**
 * Ride rating submitted by the passenger after trip completion.
 */
export interface RideRating {
  readonly ratingId: string;
  readonly rideId: string;
  readonly passengerId: PassengerId;
  readonly driverId: string;
  readonly score: 1 | 2 | 3 | 4 | 5;
  readonly comment?: string;
  readonly tags?: ReadonlyArray<'clean_vehicle' | 'safe_driving' | 'friendly' | 'punctual'>;
  readonly submittedAt: ISODateString;
}
