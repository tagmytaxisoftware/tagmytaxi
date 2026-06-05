import type { Driver, DriverId, RideRequest, TenantId } from '@tagmytaxi/shared';
import { MockMatchingService } from '../MockMatchingService';
import type { MatchingDependencies, MatchingServiceConfig } from '../AbstractMatchingService';

function makeConfig(): MatchingServiceConfig {
  return {
    tenantId: 'test-tenant',
    initialSearchRadiusKm: 5,
    radiusExpansionFactor: 1.5,
    maxSearchExpansions: 3,
    minCandidates: 1,
    driverAcceptanceWindowSeconds: 15,
  };
}

function makeDriver(overrides: Partial<Driver> = {}): Driver {
  return {
    driverId: 'driver-001' as DriverId,
    tenantId: 'test-tenant' as TenantId,
    firstName: 'Ahmed',
    lastName: 'Al Rashidi',
    phone: '+971501234567' as import('@tagmytaxi/shared').E164Phone,
    email: 'ahmed@example.com',
    status: 'AVAILABLE',
    vehicleCategoryId: 'economy',
    vehicle: {
      vehicleId: 'v-001',
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      color: 'White',
      licensePlate: 'DXB-A-12345',
      categoryId: 'economy',
      capacity: 4,
      isWheelchairAccessible: false,
    },
    rating: 4.8,
    totalTrips: 1250,
    licenseVerification: 'VERIFIED',
    backgroundCheckStatus: 'VERIFIED',
    createdAt: '2023-01-15T08:00:00.000Z' as import('@tagmytaxi/shared').ISODateString,
    ...overrides,
  };
}

function makeDeps(overrides: Partial<MatchingDependencies> = {}): MatchingDependencies {
  const driver = makeDriver();
  return {
    geoIndex: {
      queryRadius: jest.fn().mockResolvedValue([{ driverId: driver.driverId, distance: 1.2 }]),
      updatePosition: jest.fn().mockResolvedValue(undefined),
    },
    driverStore: {
      getDriver: jest.fn().mockResolvedValue(driver),
      getDriverStatus: jest.fn().mockResolvedValue('AVAILABLE'),
      setDriverStatus: jest.fn().mockResolvedValue(undefined),
    },
    rideStore: {
      getRide: jest.fn().mockResolvedValue({ status: 'PENDING' }),
      updateRideStatus: jest.fn().mockResolvedValue(undefined),
      createAssignment: jest.fn().mockResolvedValue(undefined),
    },
    eventBus: { publish: jest.fn().mockResolvedValue(undefined) },
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    metrics: { increment: jest.fn(), histogram: jest.fn() },
    ...overrides,
  };
}

const rideRequest: RideRequest = {
  tenantId: 'test-tenant' as TenantId,
  passengerId: 'pax-001' as import('@tagmytaxi/shared').PassengerId,
  pickup: { lat: 25.2048, lng: 55.2708, address: 'Dubai Mall' },
  dropoff: { lat: 25.1972, lng: 55.2797, address: 'Dubai Airport T3' },
  vehicleCategoryId: 'economy',
};

describe('MockMatchingService', () => {
  let service: MockMatchingService;
  let deps: MatchingDependencies;

  beforeEach(() => {
    deps = makeDeps();
    service = new MockMatchingService(makeConfig(), deps);
  });

  describe('findNearbyDrivers', () => {
    it('returns scored drivers for a valid request', async () => {
      const drivers = await service.findNearbyDrivers(rideRequest);
      expect(drivers).toHaveLength(1);
      expect(drivers[0]?.driverId).toBe('driver-001');
    });

    it('expands radius when fewer than minCandidates are found', async () => {
      (deps.geoIndex.queryRadius as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ driverId: 'driver-001', distance: 7 }]);

      const drivers = await service.findNearbyDrivers(rideRequest);
      expect(drivers).toHaveLength(1);
      expect(deps.geoIndex.queryRadius).toHaveBeenCalledTimes(2);
    });

    it('returns empty array when no drivers found after all expansions', async () => {
      (deps.geoIndex.queryRadius as jest.Mock).mockResolvedValue([]);
      const drivers = await service.findNearbyDrivers(rideRequest);
      expect(drivers).toHaveLength(0);
    });

    it('excludes unavailable drivers from results', async () => {
      (deps.driverStore.getDriver as jest.Mock).mockResolvedValue(
        makeDriver({ status: 'ON_TRIP' }),
      );
      const drivers = await service.findNearbyDrivers(rideRequest);
      expect(drivers).toHaveLength(0);
    });

    it('emits metrics on each call', async () => {
      await service.findNearbyDrivers(rideRequest);
      expect(deps.metrics.histogram).toHaveBeenCalledWith(
        'matching.candidate_count',
        expect.any(Number),
        expect.any(Object),
      );
      expect(deps.metrics.histogram).toHaveBeenCalledWith(
        'matching.find_nearby_latency_ms',
        expect.any(Number),
        expect.any(Object),
      );
    });
  });

  describe('calculateETA', () => {
    it('returns a plausible ETA result', async () => {
      const eta = await service.calculateETA(
        { lat: 25.2048, lng: 55.2708 },
        { lat: 25.2300, lng: 55.3000 },
      );
      expect(eta.durationSeconds).toBeGreaterThan(0);
      expect(eta.distanceMeters).toBeGreaterThan(0);
      expect(eta.trafficAware).toBe(false);
    });

    it('returns at least 120 seconds for very short distances', async () => {
      const eta = await service.calculateETA(
        { lat: 25.2048, lng: 55.2708 },
        { lat: 25.2049, lng: 55.2709 },
      );
      expect(eta.durationSeconds).toBeGreaterThanOrEqual(120);
    });
  });

  describe('assignDriver', () => {
    it('assigns a driver and publishes domain event', async () => {
      const assignment = await service.assignDriver(
        'ride-001' as import('@tagmytaxi/shared').RideId,
        'driver-001',
      );
      expect(assignment.rideId).toBe('ride-001');
      expect(assignment.driverId).toBe('driver-001');
      expect(deps.rideStore.updateRideStatus).toHaveBeenCalledWith(
        'ride-001',
        'DRIVER_ASSIGNED',
        'driver-001',
      );
      expect(deps.eventBus.publish).toHaveBeenCalledWith(
        'ride.driver_assigned',
        expect.objectContaining({ rideId: 'ride-001', driverId: 'driver-001' }),
      );
    });

    it('throws when ride is not in PENDING status', async () => {
      (deps.rideStore.getRide as jest.Mock).mockResolvedValue({ status: 'IN_PROGRESS' });
      await expect(service.assignDriver('ride-001' as import('@tagmytaxi/shared').RideId, 'driver-001')).rejects.toThrow(
        /Cannot assign driver/,
      );
    });

    it('throws when driver is not available', async () => {
      (deps.driverStore.getDriverStatus as jest.Mock).mockResolvedValue('ON_TRIP');
      await expect(service.assignDriver('ride-001' as import('@tagmytaxi/shared').RideId, 'driver-001')).rejects.toThrow(
        /not available/,
      );
    });
  });

  describe('releaseDriver', () => {
    it('sets driver status to AVAILABLE and publishes event', async () => {
      await service.releaseDriver(
        'ride-001' as import('@tagmytaxi/shared').RideId,
        'driver-001',
      );
      expect(deps.driverStore.setDriverStatus).toHaveBeenCalledWith('driver-001', 'AVAILABLE');
      expect(deps.eventBus.publish).toHaveBeenCalledWith('driver.released', expect.any(Object));
    });
  });

  describe('scoreDriver', () => {
    it('returns a score between 0 and 1', async () => {
      const score = await service.scoreDriver('driver-001', rideRequest);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('returns 0 for an unknown driver', async () => {
      (deps.driverStore.getDriver as jest.Mock).mockResolvedValue(null);
      const score = await service.scoreDriver('unknown-driver', rideRequest);
      expect(score).toBe(0);
    });
  });
});
