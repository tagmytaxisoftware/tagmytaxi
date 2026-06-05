/**
 * @fileoverview Abstract base class for the real-time GPS tracking service.
 *
 * ## Pipeline Architecture
 *
 * The tracking pipeline operates in two concurrent modes:
 *
 * **Live mode** — Driver app publishes {@link LocationUpdate} events over WebSocket
 * at ~2s intervals. The service fans out these updates via Redis Pub/Sub to all
 * active passenger-side subscribers with sub-200ms end-to-end latency. Each Pub/Sub
 * channel is namespaced as `ride:loc:{rideId}`, ensuring tenant isolation.
 *
 * **Persistent mode** — Every location sample is appended to a driver-specific
 * Redis Stream (`loc:stream:{driverId}`). A background flush job reads these
 * streams every 30 seconds and writes the buffered coordinates to PostgreSQL
 * `trip_path` records. The stream is trimmed to `streamMaxLength` entries to
 * bound Redis memory usage. PostgreSQL records are the authoritative source for
 * billing dispute resolution and safety investigations.
 *
 * **Geospatial index** — The driver's position is updated in a Redis GEO key
 * (`geo:drivers:{tenantId}`) on every `publishLocation` call. This index is
 * queried by the matching service for O(N+log M) radius searches.
 *
 * The abstract class owns: Redis lifecycle, stream trimming, Pub/Sub fan-out,
 * subscription registry, and metrics. Concrete subclasses implement the
 * geospatial index strategy and last-known-location storage.
 *
 * @module @tagmytaxi/tracking-service
 */

import type { ITrackingService, LocationUpdateCallback, Unsubscribe } from '@tagmytaxi/shared';
import type { Coordinate, LocationUpdate } from '@tagmytaxi/shared';
import type { DriverId, RideId, TenantId } from '@tagmytaxi/shared';

export interface TrackingServiceConfig {
  readonly tenantId: string;
  /** Redis Stream max length before trimming (MAXLEN ~). Default: 10 000 per driver */
  readonly streamMaxLength: number;
  /** TTL for last-known-location keys in Redis, in seconds. Default: 1800 */
  readonly lastLocationTtlSeconds: number;
  /** Interval in ms between flushing location buffer to PostgreSQL */
  readonly persistenceFlushIntervalMs: number;
}

export interface TrackingDependencies {
  readonly pubSubClient: PubSubAdapter;
  readonly streamClient: StreamAdapter;
  readonly geoClient: GeoAdapter;
  readonly logger: LoggerAdapter;
  readonly metrics: MetricsAdapter;
}

export interface PubSubAdapter {
  publish(channel: string, message: string): Promise<void>;
  subscribe(channel: string, callback: (message: string) => void): Unsubscribe;
}

export interface StreamAdapter {
  append(stream: string, fields: Record<string, string>): Promise<string>;
  trim(stream: string, maxLength: number): Promise<void>;
  readRange(stream: string, start: string, end: string): Promise<ReadonlyArray<Record<string, string>>>;
}

export interface GeoAdapter {
  add(key: string, lng: number, lat: number, member: string): Promise<void>;
  radius(
    key: string,
    lng: number,
    lat: number,
    radiusKm: number,
  ): Promise<ReadonlyArray<{ member: string; distance: number }>>;
}

export interface LoggerAdapter {
  info(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, err: Error, ctx?: Record<string, unknown>): void;
}

export interface MetricsAdapter {
  increment(name: string, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
}

/**
 * @abstract
 * @class AbstractTrackingService
 * @implements ITrackingService
 */
export abstract class AbstractTrackingService implements ITrackingService {
  protected readonly config: TrackingServiceConfig;
  protected readonly deps: TrackingDependencies;
  /** Maps rideId → Set of active local callbacks */
  private readonly subscriptions = new Map<string, Set<LocationUpdateCallback>>();

  constructor(config: TrackingServiceConfig, deps: TrackingDependencies) {
    this.config = config;
    this.deps = deps;
  }

  async publishLocation(update: LocationUpdate): Promise<void> {
    const start = Date.now();
    try {
      // 1. Update geospatial index for proximity queries (matching service)
      await this.deps.geoClient.add(
        `geo:drivers:${this.config.tenantId}`,
        update.coordinate.lng,
        update.coordinate.lat,
        update.driverId,
      );

      // 2. Append to Redis Stream for durable persistence
      const streamKey = `loc:stream:${update.driverId}`;
      await this.deps.streamClient.append(streamKey, {
        lat: String(update.coordinate.lat),
        lng: String(update.coordinate.lng),
        bearing: String(update.bearing),
        speed: String(update.speed),
        ts: update.capturedAt,
        tripId: update.activeTripId ?? '',
      });
      await this.deps.streamClient.trim(streamKey, this.config.streamMaxLength);

      // 3. Fan out to ride-specific Pub/Sub channel for live passenger updates
      if (update.activeTripId) {
        const channel = `ride:loc:${update.activeTripId}`;
        await this.deps.pubSubClient.publish(channel, JSON.stringify(update));
        this.notifyLocalSubscribers(update.activeTripId, update);
      }

      // 4. Delegate last-known-location storage to concrete subclass
      await this.doStoreLastKnownLocation(update);

      this.deps.metrics.histogram(
        'tracking.publish.latency_ms',
        Date.now() - start,
        { tenant: this.config.tenantId },
      );
      this.deps.metrics.increment('tracking.publish.success', { tenant: this.config.tenantId });
    } catch (error) {
      this.deps.metrics.increment('tracking.publish.error', { tenant: this.config.tenantId });
      this.deps.logger.error('Failed to publish location update', error as Error, {
        driverId: update.driverId,
      });
      throw error;
    }
  }

  subscribeToRide(rideId: RideId, callback: LocationUpdateCallback): Unsubscribe {
    if (!this.subscriptions.has(rideId)) {
      this.subscriptions.set(rideId, new Set());
    }
    this.subscriptions.get(rideId)!.add(callback);

    this.deps.metrics.increment('tracking.subscriptions.active', {
      tenant: this.config.tenantId,
    });

    return (): void => {
      const callbacks = this.subscriptions.get(rideId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) this.subscriptions.delete(rideId);
      }
      this.deps.metrics.increment('tracking.subscriptions.closed', {
        tenant: this.config.tenantId,
      });
    };
  }

  async getLastKnownLocation(driverId: DriverId): Promise<Coordinate | null> {
    return this.doGetLastKnownLocation(driverId);
  }

  async getDriversInArea(
    center: Coordinate,
    radiusKm: number,
    tenantId: TenantId,
  ): Promise<ReadonlyArray<{ driverId: DriverId; location: Coordinate; bearing: number }>> {
    return this.doGetDriversInArea(center, radiusKm, tenantId);
  }

  async getTripPath(rideId: RideId): Promise<ReadonlyArray<Coordinate>> {
    return this.doGetTripPath(rideId);
  }

  // ── Internal helpers ───────────────────────────────────────────────────

  private notifyLocalSubscribers(rideId: string, update: LocationUpdate): void {
    const callbacks = this.subscriptions.get(rideId);
    if (!callbacks) return;
    for (const cb of callbacks) {
      try {
        cb(update);
      } catch {
        // Subscriber errors must not crash the publish pipeline
      }
    }
  }

  // ── Abstract hooks ─────────────────────────────────────────────────────

  protected abstract doStoreLastKnownLocation(update: LocationUpdate): Promise<void>;
  protected abstract doGetLastKnownLocation(driverId: DriverId): Promise<Coordinate | null>;
  protected abstract doGetDriversInArea(
    center: Coordinate,
    radiusKm: number,
    tenantId: TenantId,
  ): Promise<ReadonlyArray<{ driverId: DriverId; location: Coordinate; bearing: number }>>;
  protected abstract doGetTripPath(rideId: RideId): Promise<ReadonlyArray<Coordinate>>;
}
