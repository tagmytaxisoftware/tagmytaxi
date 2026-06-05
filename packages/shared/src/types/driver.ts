/**
 * @fileoverview Driver domain types for the TagMyTaxi platform.
 * @module @tagmytaxi/shared/types/driver
 */

import type { Coordinate } from './location';
import type { DriverId, E164Phone, ISODateString, RideId, TenantId } from './common';

/**
 * Online/offline/busy status of a driver in the dispatch system.
 */
export type DriverStatus = 'OFFLINE' | 'AVAILABLE' | 'ON_TRIP' | 'ON_BREAK' | 'SUSPENDED';

/**
 * Document verification status.
 */
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

/**
 * Core driver profile.
 */
export interface Driver {
  readonly driverId: DriverId;
  readonly tenantId: TenantId;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: E164Phone;
  readonly email: string;
  readonly profilePhotoUrl?: string;
  readonly status: DriverStatus;
  readonly vehicleCategoryId: string;
  readonly vehicle: Vehicle;
  readonly rating: number;
  readonly totalTrips: number;
  readonly licenseVerification: VerificationStatus;
  readonly backgroundCheckStatus: VerificationStatus;
  readonly createdAt: ISODateString;
}

/**
 * Vehicle associated with a driver.
 */
export interface Vehicle {
  readonly vehicleId: string;
  readonly make: string;
  readonly model: string;
  readonly year: number;
  readonly color: string;
  readonly licensePlate: string;
  readonly categoryId: string;
  /** Maximum number of passengers (excluding driver) */
  readonly capacity: number;
  readonly isWheelchairAccessible: boolean;
  readonly photoUrl?: string;
}

/**
 * Driver assignment result returned by the matching service.
 */
export interface Assignment {
  readonly rideId: RideId;
  readonly driverId: DriverId;
  readonly driver: Driver;
  readonly estimatedPickupSeconds: number;
  readonly driverLocation: Coordinate;
  readonly assignedAt: ISODateString;
}

/**
 * Live driver state for dispatch and tracking views.
 */
export interface DriverLiveState {
  readonly driverId: DriverId;
  readonly status: DriverStatus;
  readonly location?: Coordinate;
  readonly bearing?: number;
  readonly speed?: number;
  readonly currentRideId?: RideId;
  readonly lastSeenAt?: ISODateString;
}
