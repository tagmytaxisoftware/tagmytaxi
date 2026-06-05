/**
 * @fileoverview Ride domain types for the TagMyTaxi platform.
 * @module @tagmytaxi/shared/types/ride
 */

import type { DriverId, ISODateString, PassengerId, RideId, TenantId } from './common';
import type { NamedLocation } from './location';

/**
 * All possible states a ride can be in during its lifecycle.
 * State transitions are enforced by the ride state machine in the API.
 *
 * @see {@link https://docs.tagmytaxi.ae/architecture/ride-lifecycle} Ride Lifecycle Docs
 */
export type RideStatus =
  | 'PENDING'         // Passenger submitted request, awaiting driver assignment
  | 'DRIVER_ASSIGNED' // Driver accepted, en route to pickup
  | 'DRIVER_ARRIVED'  // Driver at pickup location
  | 'IN_PROGRESS'     // Trip underway
  | 'COMPLETED'       // Trip finished, fare calculated
  | 'CANCELLED'       // Cancelled by passenger, driver, or system
  | 'PAYMENT_FAILED'; // Completed but payment processing failed

/** Who initiated the cancellation */
export type CancellationActor = 'PASSENGER' | 'DRIVER' | 'DISPATCHER' | 'SYSTEM';

/**
 * A passenger's inbound ride request.
 */
export interface RideRequest {
  readonly tenantId: TenantId;
  readonly passengerId: PassengerId;
  readonly pickup: NamedLocation;
  readonly dropoff: NamedLocation;
  readonly vehicleCategoryId: string;
  readonly promoCode?: string;
  readonly scheduledAt?: ISODateString;
  readonly notes?: string;
  /** Number of additional passengers beyond the primary */
  readonly additionalPassengers?: number;
}

/**
 * Full ride entity as stored and returned by the API.
 */
export interface Ride {
  readonly rideId: RideId;
  readonly tenantId: TenantId;
  readonly passengerId: PassengerId;
  readonly driverId?: DriverId;
  readonly status: RideStatus;
  readonly pickup: NamedLocation;
  readonly dropoff: NamedLocation;
  readonly vehicleCategoryId: string;
  readonly fareEstimateId?: string;
  readonly finalFareAmount?: number;
  readonly currency: string;
  readonly distanceMeters?: number;
  readonly durationSeconds?: number;
  readonly waitTimeSeconds?: number;
  readonly cancellationReason?: string;
  readonly cancellationActor?: CancellationActor;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly completedAt?: ISODateString;
}

/**
 * Ride details passed to billing for fare calculation.
 * Populated once the trip completes and odometer/timer data is available.
 */
export interface RideDetails {
  readonly rideId: RideId;
  readonly tenantId: TenantId;
  readonly vehicleCategoryId: string;
  readonly distanceMeters: number;
  readonly durationSeconds: number;
  readonly waitTimeSeconds: number;
  readonly origin: NamedLocation;
  readonly destination: NamedLocation;
  readonly promoCode?: string;
  readonly pickupZoneId?: string;
  readonly dropoffZoneId?: string;
  readonly isAirportRide?: boolean;
  readonly isNightTime?: boolean;
}
