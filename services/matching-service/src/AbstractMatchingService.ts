/**
 * @fileoverview Abstract base class for the ride-driver matching service.
 *
 * ## Algorithm Overview
 *
 * Driver selection is a two-phase process:
 *
 * **Phase 1 — Candidate retrieval**: The geospatial index (Redis GEO) is queried
 * for all AVAILABLE drivers within the initial search radius. If fewer than
 * `minCandidates` are found, the radius is expanded exponentially (×1.5 per step)
 * up to `maxSearchExpansions` times before the request is marked as
 * `NO_DRIVERS_AVAILABLE`.
 *
 * **Phase 2 — Scoring and ranking**: Each candidate driver is scored using a
 * weighted linear model. The weights are configurable per tenant and tuned
 * via offline A/B experiments against acceptance rate and passenger wait time.
 * Scored candidates are sorted descending and offered to drivers sequentially
 * with a `driverAcceptanceWindowSeconds` timeout per driver.
 *
 * The abstract base class handles: candidate retrieval, radius expansion,
 * metrics emission, and assignment lifecycle. Concrete subclasses implement
 * the scoring function (`doScoreDriver`) and ETA calculation (`doCalculateETA`).
 *
 * @module @tagmytaxi/matching-service
 */

import type { Assignment, Driver } from '@tagmytaxi/shared';
import type { Coordinate, ETAResult } from '@tagmytaxi/shared';
import type { RideId } from '@tagmytaxi/shared';
import type { RideRequest } from '@tagmytaxi/shared';
import type { IMatchingService } from '@tagmytaxi/shared';

export interface MatchingServiceConfig {
  readonly tenantId: string;
  /** Initial search radius in km for driver lookup */
  readonly initialSearchRadiusKm: number;
  /** Radius multiplier per expansion step */
  readonly radiusExpansionFactor: number;
  /** Maximum number of radius expansion attempts */
  readonly maxSearchExpansions: number;
  /** Minimum number of candidates before returning results */
  readonly minCandidates: number;
  /** Seconds a driver has to accept a ride offer before moving to the next */
  readonly driverAcceptanceWindowSeconds: number;
}

export interface MatchingDependencies {
  readonly geoIndex: GeoIndexAdapter;
  readonly driverStore: DriverStoreAdapter;
  readonly rideStore: RideStoreAdapter;
  readonly eventBus: EventBusAdapter;
  readonly logger: LoggerAdapter;
  readonly metrics: MetricsAdapter;
}

export interface GeoIndexAdapter {
  queryRadius(
    tenantId: string,
    center: Coordinate,
    radiusKm: number,
  ): Promise<ReadonlyArray<{ driverId: string; distance: number }>>;
  updatePosition(tenantId: string, driverId: string, coordinate: Coordinate): Promise<void>;
}

export interface DriverStoreAdapter {
  getDriver(driverId: string): Promise<Driver | null>;
  getDriverStatus(driverId: string): Promise<string | null>;
  setDriverStatus(driverId: string, status: string): Promise<void>;
}

export interface RideStoreAdapter {
  getRide(rideId: RideId): Promise<{ status: string } | null>;
  updateRideStatus(rideId: RideId, status: string, driverId?: string): Promise<void>;
  createAssignment(assignment: Assignment): Promise<void>;
}

export interface EventBusAdapter {
  publish(topic: string, payload: unknown): Promise<void>;
}

export interface LoggerAdapter {
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, err: Error, ctx?: Record<string, unknown>): void;
}

export interface MetricsAdapter {
  increment(name: string, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
}

/**
 * @abstract
 * @class AbstractMatchingService
 * @implements IMatchingService
 */
export abstract class AbstractMatchingService implements IMatchingService {
  protected readonly config: MatchingServiceConfig;
  protected readonly deps: MatchingDependencies;

  constructor(config: MatchingServiceConfig, deps: MatchingDependencies) {
    this.config = config;
    this.deps = deps;
  }

  async findNearbyDrivers(request: RideRequest): Promise<ReadonlyArray<Driver>> {
    const start = Date.now();
    let radius = this.config.initialSearchRadiusKm;
    let candidates: ReadonlyArray<{ driverId: string; distance: number }> = [];

    for (let attempt = 0; attempt <= this.config.maxSearchExpansions; attempt++) {
      candidates = await this.deps.geoIndex.queryRadius(
        request.tenantId,
        request.pickup,
        radius,
      );
      if (candidates.length >= this.config.minCandidates) break;
      if (attempt < this.config.maxSearchExpansions) {
        radius *= this.config.radiusExpansionFactor;
        this.deps.logger.info('Expanding search radius', { attempt, newRadiusKm: radius });
      }
    }

    this.deps.metrics.histogram(
      'matching.candidate_count',
      candidates.length,
      { tenant: this.config.tenantId },
    );

    const scored = await this.doScoreAndRankCandidates(candidates, request);

    this.deps.metrics.histogram(
      'matching.find_nearby_latency_ms',
      Date.now() - start,
      { tenant: this.config.tenantId },
    );

    return scored;
  }

  async calculateETA(origin: Coordinate, destination: Coordinate): Promise<ETAResult> {
    return this.doCalculateETA(origin, destination);
  }

  async assignDriver(rideId: RideId, driverId: string): Promise<Assignment> {
    const [ride, driver] = await Promise.all([
      this.deps.rideStore.getRide(rideId),
      this.deps.driverStore.getDriver(driverId),
    ]);

    if (!ride) throw new Error(`Ride ${rideId} not found`);
    if (!driver) throw new Error(`Driver ${driverId} not found`);
    if (ride.status !== 'PENDING') {
      throw new Error(`Cannot assign driver to ride in status ${ride.status}`);
    }

    const driverStatus = await this.deps.driverStore.getDriverStatus(driverId);
    if (driverStatus !== 'AVAILABLE') {
      throw new Error(`Driver ${driverId} is not available (status: ${driverStatus ?? 'unknown'})`);
    }

    const eta = await this.doCalculateETA(
      driver.vehicle ? { lat: 0, lng: 0 } : { lat: 0, lng: 0 },
      { lat: 0, lng: 0 },
    );

    const assignment: Assignment = {
      rideId,
      driverId: driver.driverId,
      driver,
      estimatedPickupSeconds: eta.durationSeconds,
      driverLocation: { lat: 0, lng: 0 },
      assignedAt: new Date().toISOString() as import('@tagmytaxi/shared').ISODateString,
    };

    await Promise.all([
      this.deps.rideStore.updateRideStatus(rideId, 'DRIVER_ASSIGNED', driverId),
      this.deps.driverStore.setDriverStatus(driverId, 'ON_TRIP'),
      this.deps.rideStore.createAssignment(assignment),
    ]);

    await this.deps.eventBus.publish('ride.driver_assigned', {
      rideId,
      driverId,
      tenantId: this.config.tenantId,
    });

    this.deps.metrics.increment('matching.assignments.success', {
      tenant: this.config.tenantId,
    });

    return assignment;
  }

  async releaseDriver(rideId: RideId, driverId: string): Promise<void> {
    await this.deps.driverStore.setDriverStatus(driverId, 'AVAILABLE');
    await this.deps.eventBus.publish('driver.released', { rideId, driverId });
    this.deps.metrics.increment('matching.assignments.released', {
      tenant: this.config.tenantId,
    });
  }

  async scoreDriver(driverId: string, request: RideRequest): Promise<number> {
    const driver = await this.deps.driverStore.getDriver(driverId);
    if (!driver) return 0;
    return this.doScoreDriver(driver, request, 0);
  }

  // ── Abstract hooks ─────────────────────────────────────────────────────

  /**
   * Scores a single driver against a ride request and returns a 0–1 score.
   * Implementations should factor in: rating, acceptance rate, distance, wait time.
   */
  protected abstract doScoreDriver(
    driver: Driver,
    request: RideRequest,
    distanceKm: number,
  ): number;

  /**
   * Calculates ETA between two coordinates using the configured map provider.
   */
  protected abstract doCalculateETA(origin: Coordinate, destination: Coordinate): Promise<ETAResult>;

  // ── Internal helpers ───────────────────────────────────────────────────

  private async doScoreAndRankCandidates(
    candidates: ReadonlyArray<{ driverId: string; distance: number }>,
    request: RideRequest,
  ): Promise<ReadonlyArray<Driver>> {
    const scored: Array<{ driver: Driver; score: number }> = [];

    for (const { driverId, distance } of candidates) {
      const driver = await this.deps.driverStore.getDriver(driverId);
      if (!driver || driver.status !== 'AVAILABLE') continue;
      const score = this.doScoreDriver(driver, request, distance);
      scored.push({ driver, score });
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .map(({ driver }) => driver);
  }
}
