import type { DriverId, LocationUpdate, RideId, TenantId } from '@tagmytaxi/shared';
import { MockTrackingService } from '../MockTrackingService';
import type { TrackingDependencies, TrackingServiceConfig } from '../AbstractTrackingService';

function makeConfig(): TrackingServiceConfig {
  return {
    tenantId: 'test-tenant',
    streamMaxLength: 1000,
    lastLocationTtlSeconds: 1800,
    persistenceFlushIntervalMs: 30000,
  };
}

function makeDeps(): TrackingDependencies {
  return {
    pubSubClient: {
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockReturnValue(() => undefined),
    },
    streamClient: {
      append: jest.fn().mockResolvedValue('stream-id-001'),
      trim: jest.fn().mockResolvedValue(undefined),
      readRange: jest.fn().mockResolvedValue([]),
    },
    geoClient: {
      add: jest.fn().mockResolvedValue(undefined),
      radius: jest.fn().mockResolvedValue([]),
    },
    logger: { info: jest.fn(), error: jest.fn() },
    metrics: { increment: jest.fn(), histogram: jest.fn() },
  };
}

function makeLocationUpdate(overrides: Partial<LocationUpdate> = {}): LocationUpdate {
  return {
    driverId: 'driver-001' as DriverId,
    activeTripId: 'ride-001' as RideId,
    coordinate: { lat: 25.2048, lng: 55.2708 },
    bearing: 90,
    speed: 40,
    accuracyMeters: 5,
    capturedAt: new Date().toISOString() as import('@tagmytaxi/shared').ISODateString,
    ...overrides,
  };
}

describe('MockTrackingService', () => {
  let service: MockTrackingService;
  let deps: TrackingDependencies;

  beforeEach(() => {
    deps = makeDeps();
    service = new MockTrackingService(makeConfig(), deps);
  });

  describe('publishLocation', () => {
    it('updates the geo index, appends to stream, and publishes to Pub/Sub', async () => {
      const update = makeLocationUpdate();
      await service.publishLocation(update);

      expect(deps.geoClient.add).toHaveBeenCalledWith(
        'geo:drivers:test-tenant',
        55.2708,
        25.2048,
        'driver-001',
      );
      expect(deps.streamClient.append).toHaveBeenCalledWith(
        'loc:stream:driver-001',
        expect.objectContaining({ lat: '25.2048', lng: '55.2708' }),
      );
      expect(deps.pubSubClient.publish).toHaveBeenCalledWith(
        'ride:loc:ride-001',
        expect.stringContaining('driver-001'),
      );
    });

    it('does not publish to Pub/Sub when there is no active trip', async () => {
      const update = makeLocationUpdate({ activeTripId: undefined });
      await service.publishLocation(update);
      expect(deps.pubSubClient.publish).not.toHaveBeenCalled();
    });

    it('emits success metric on each publish', async () => {
      await service.publishLocation(makeLocationUpdate());
      expect(deps.metrics.increment).toHaveBeenCalledWith(
        'tracking.publish.success',
        expect.any(Object),
      );
    });

    it('emits error metric and rethrows when geo.add fails', async () => {
      (deps.geoClient.add as jest.Mock).mockRejectedValue(new Error('Redis connection refused'));
      await expect(service.publishLocation(makeLocationUpdate())).rejects.toThrow(
        'Redis connection refused',
      );
      expect(deps.metrics.increment).toHaveBeenCalledWith(
        'tracking.publish.error',
        expect.any(Object),
      );
    });
  });

  describe('subscribeToRide / getLastKnownLocation', () => {
    it('invokes the callback when a location is published for the subscribed ride', async () => {
      const callback = jest.fn();
      service.subscribeToRide('ride-001' as RideId, callback);
      await service.publishLocation(makeLocationUpdate({ activeTripId: 'ride-001' as RideId }));
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('does not invoke callback after unsubscribe', async () => {
      const callback = jest.fn();
      const unsubscribe = service.subscribeToRide('ride-001' as RideId, callback);
      unsubscribe();
      await service.publishLocation(makeLocationUpdate({ activeTripId: 'ride-001' as RideId }));
      expect(callback).not.toHaveBeenCalled();
    });

    it('stores and retrieves the last known location', async () => {
      await service.publishLocation(makeLocationUpdate());
      const loc = await service.getLastKnownLocation('driver-001' as DriverId);
      expect(loc).toEqual({ lat: 25.2048, lng: 55.2708 });
    });

    it('returns null for an unknown driver', async () => {
      const loc = await service.getLastKnownLocation('unknown-driver' as DriverId);
      expect(loc).toBeNull();
    });
  });

  describe('getDriversInArea', () => {
    it('returns 3–5 mock drivers', async () => {
      const drivers = await service.getDriversInArea(
        { lat: 25.2048, lng: 55.2708 },
        5,
        'test-tenant' as TenantId,
      );
      expect(drivers.length).toBeGreaterThanOrEqual(3);
      expect(drivers.length).toBeLessThanOrEqual(5);
      expect(drivers[0]).toHaveProperty('driverId');
      expect(drivers[0]).toHaveProperty('location');
      expect(drivers[0]).toHaveProperty('bearing');
    });
  });

  describe('getTripPath', () => {
    it('returns a 20-point coordinate array', async () => {
      const path = await service.getTripPath('ride-001' as RideId);
      expect(path).toHaveLength(20);
      expect(path[0]).toHaveProperty('lat');
      expect(path[0]).toHaveProperty('lng');
    });
  });
});
