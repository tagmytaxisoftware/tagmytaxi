/**
 * @fileoverview Matching service interface — the contract between the API layer
 * and the proprietary ride-driver matching engine.
 *
 * The matching engine implements a multi-factor scoring algorithm that weighs:
 * - Geospatial proximity (haversine distance and road network ETA)
 * - Driver acceptance rate and online streak
 * - Passenger and driver rating compatibility
 * - Vehicle category suitability
 * - Zone-specific dispatch rules (e.g. airport queue management)
 *
 * Concrete implementations are kept private and deploy in isolated compute.
 * This interface is the only surface exposed to consuming packages.
 *
 * @module @tagmytaxi/shared/interfaces
 */

import type { Assignment, Driver } from '../types/driver';
import type { Coordinate, ETAResult } from '../types/location';
import type { RideId } from '../types/common';
import type { RideRequest } from '../types/ride';

/**
 * Contract for the ride-driver matching service.
 *
 * Implementations must be:
 * - **Idempotent**: calling `assignDriver` twice for the same `rideId` must not
 *   create duplicate assignments.
 * - **Tenant-isolated**: all queries must be scoped to `request.tenantId`.
 * - **Observable**: all operations should emit metrics and structured logs.
 */
export interface IMatchingService {
  /**
   * Returns an ordered list of candidate drivers for the given ride request.
   * Drivers are scored and ranked before returning; the caller selects the
   * first driver who accepts within the configured acceptance window.
   *
   * @param request - The passenger's ride request including pickup coordinates.
   * @returns Ordered array of available drivers, best match first. Empty array
   *          if no drivers are available within the configured search radius.
   * @throws {MatchingServiceError} if the geospatial index is unavailable.
   */
  findNearbyDrivers(request: RideRequest): Promise<ReadonlyArray<Driver>>;

  /**
   * Calculates the estimated time of arrival from `origin` to `destination`
   * using the configured map provider and real-time traffic data.
   *
   * @param origin - Starting coordinate.
   * @param destination - Ending coordinate.
   * @returns ETA result including duration, distance, and confidence level.
   */
  calculateETA(origin: Coordinate, destination: Coordinate): Promise<ETAResult>;

  /**
   * Atomically assigns a driver to a ride and transitions the ride status
   * to `DRIVER_ASSIGNED`. Publishes a `ride.driver_assigned` domain event.
   *
   * @param rideId - The ride to assign.
   * @param driverId - The driver to assign to the ride.
   * @returns The created assignment including driver details and pickup ETA.
   * @throws {DriverAlreadyAssignedError} if the driver is already on a trip.
   * @throws {RideNotFoundError} if the rideId does not exist or is not in PENDING state.
   */
  assignDriver(rideId: RideId, driverId: string): Promise<Assignment>;

  /**
   * Releases a driver from an assignment, transitioning them back to AVAILABLE.
   * Called on cancellation or system-initiated reassignment.
   *
   * @param rideId - The ride the driver is being released from.
   * @param driverId - The driver being released.
   */
  releaseDriver(rideId: RideId, driverId: string): Promise<void>;

  /**
   * Computes a match score for a driver against a ride request.
   * Exposed for debugging and dispatcher overrides; not used in the hot path.
   *
   * @param driverId - Driver to evaluate.
   * @param request - The ride request to score against.
   * @returns Score between 0 and 1 (higher is better).
   */
  scoreDriver(driverId: string, request: RideRequest): Promise<number>;
}
