/**
 * @fileoverview Tracking service interface — the contract for the real-time
 * GPS tracking pipeline.
 *
 * The tracking pipeline operates in two concurrent modes:
 *
 * **Live mode** — Driver app publishes `LocationUpdate` events over WebSocket.
 * The service fans out these updates via Redis Pub/Sub to all active subscribers
 * (passenger app sessions) with sub-200ms latency.
 *
 * **Persistent mode** — Location updates are buffered in Redis Streams and
 * flushed to PostgreSQL `trip_path` records every 30 seconds. This creates a
 * durable, queryable audit trail for billing disputes, safety investigations,
 * and analytics.
 *
 * The geospatial index (Redis GEO) is updated on every `publishLocation` call,
 * enabling the matching service to perform sub-millisecond radius queries.
 *
 * @module @tagmytaxi/shared/interfaces
 */

import type { Coordinate, LocationUpdate } from '../types/location';
import type { DriverId, RideId, TenantId } from '../types/common';

/**
 * Callback invoked whenever a new location update arrives for a subscribed ride.
 */
export type LocationUpdateCallback = (update: LocationUpdate) => void;

/**
 * Function returned by `subscribeToRide` that unregisters the subscription.
 */
export type Unsubscribe = () => void;

/**
 * Contract for the real-time driver tracking service.
 *
 * All implementations must guarantee:
 * - **At-most-once delivery** for live updates (stale updates are discarded).
 * - **At-least-once persistence** for stream writes (retried on Redis error).
 * - **Tenant isolation** — no cross-tenant data leakage in pub/sub channels or geo keys.
 */
export interface ITrackingService {
  /**
   * Ingests a single GPS location update from a driver's mobile app.
   *
   * Performs three operations atomically:
   * 1. Updates the driver's position in the geospatial index.
   * 2. Appends the update to the driver's Redis Stream.
   * 3. Publishes the update to the ride's Pub/Sub channel (if on an active trip).
   *
   * @param update - The location sample to process.
   */
  publishLocation(update: LocationUpdate): Promise<void>;

  /**
   * Registers a callback to receive live location updates for a specific ride.
   * Multiple callbacks may be registered for the same ride.
   *
   * @param rideId - The ride to subscribe to.
   * @param callback - Function invoked on each incoming location update.
   * @returns An `Unsubscribe` function; call it to cancel the subscription.
   */
  subscribeToRide(rideId: RideId, callback: LocationUpdateCallback): Unsubscribe;

  /**
   * Returns the most recently recorded location for a driver.
   * Reads from Redis (fast path); falls back to PostgreSQL if the key has expired.
   *
   * @param driverId - The driver to query.
   * @returns The last known coordinate, or `null` if the driver has never been tracked.
   */
  getLastKnownLocation(driverId: DriverId): Promise<Coordinate | null>;

  /**
   * Returns all available drivers within `radiusKm` of `center` for the given tenant.
   * Queries the Redis GEO index — O(N + log(M)) where N is results and M is index size.
   *
   * @param center - The center point of the search area.
   * @param radiusKm - Search radius in kilometres.
   * @param tenantId - Tenant scope for the query.
   * @returns Array of nearby drivers with their current location and bearing.
   */
  getDriversInArea(
    center: Coordinate,
    radiusKm: number,
    tenantId: TenantId,
  ): Promise<ReadonlyArray<{ driverId: DriverId; location: Coordinate; bearing: number }>>;

  /**
   * Retrieves the complete GPS path for a completed trip from the persistent store.
   * Used for receipt generation, billing dispute resolution, and safety review.
   *
   * @param rideId - The ride whose path to retrieve.
   * @returns Ordered array of coordinates from pickup to dropoff.
   */
  getTripPath(rideId: RideId): Promise<ReadonlyArray<Coordinate>>;
}
