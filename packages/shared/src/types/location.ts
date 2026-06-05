/**
 * @fileoverview Location and geospatial types for the TagMyTaxi platform.
 * @module @tagmytaxi/shared/types/location
 */

import type { DriverId, ISODateString, RideId } from './common';

/**
 * WGS-84 coordinate pair. Latitude and longitude are always validated
 * to be within their respective valid ranges before storage.
 */
export interface Coordinate {
  /** Decimal degrees, range [-90, 90] */
  readonly lat: number;
  /** Decimal degrees, range [-180, 180] */
  readonly lng: number;
}

/**
 * A coordinate with a human-readable address label.
 */
export interface NamedLocation extends Coordinate {
  readonly address: string;
  readonly placeId?: string;
}

/**
 * A single GPS location sample published by a driver's mobile app.
 * Published via WebSocket at approximately 2-second intervals during an active trip.
 */
export interface LocationUpdate {
  readonly driverId: DriverId;
  /** The active trip this location update belongs to, if any */
  readonly activeTripId?: RideId;
  readonly coordinate: Coordinate;
  /** Heading in degrees clockwise from true north, range [0, 360) */
  readonly bearing: number;
  /** Speed in km/h */
  readonly speed: number;
  /** Horizontal accuracy in meters from the device GPS */
  readonly accuracyMeters: number;
  /** Unix timestamp (ms) when the GPS sample was captured on-device */
  readonly capturedAt: ISODateString;
}

/**
 * ETA calculation result returned by the matching service.
 */
export interface ETAResult {
  /** Estimated travel time in seconds */
  readonly durationSeconds: number;
  /** Estimated distance in meters */
  readonly distanceMeters: number;
  /** Whether the ETA includes real-time traffic data */
  readonly trafficAware: boolean;
  /** Confidence interval: low/medium/high based on data availability */
  readonly confidence: 'low' | 'medium' | 'high';
  readonly calculatedAt: ISODateString;
}

/**
 * Represents a geographic zone used for surge pricing and dispatch rules.
 */
export interface Zone {
  readonly zoneId: string;
  readonly name: string;
  /** GeoJSON polygon coordinates [[lng, lat], ...] */
  readonly polygon: ReadonlyArray<readonly [number, number]>;
  readonly isAirport: boolean;
  readonly isCBD: boolean;
}
