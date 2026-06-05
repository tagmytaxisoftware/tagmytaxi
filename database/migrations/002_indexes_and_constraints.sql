-- ============================================================
-- Migration: 002 — Performance indexes and constraints
-- ============================================================

-- Rides — high-frequency queries
CREATE INDEX CONCURRENTLY idx_rides_tenant_status ON rides (tenant_id, status)
    WHERE status IN ('PENDING', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS');
CREATE INDEX CONCURRENTLY idx_rides_passenger_id ON rides (passenger_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_rides_driver_id ON rides (driver_id, created_at DESC)
    WHERE driver_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_rides_created_at ON rides (created_at DESC);

-- Drivers — dispatch queries
CREATE INDEX CONCURRENTLY idx_drivers_tenant_status ON drivers (tenant_id, status)
    WHERE status = 'AVAILABLE';

-- Trip paths — geospatial queries
CREATE INDEX CONCURRENTLY idx_trip_paths_ride_id ON trip_paths (ride_id, captured_at);
CREATE INDEX CONCURRENTLY idx_trip_paths_location ON trip_paths USING GIST (location);

-- Transactions — audit and reporting
CREATE INDEX CONCURRENTLY idx_transactions_ride_id ON transactions (ride_id);
CREATE INDEX CONCURRENTLY idx_transactions_tenant_date ON transactions (tenant_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_transactions_gateway ON transactions (gateway_transaction_id)
    WHERE gateway_transaction_id IS NOT NULL;

-- Audit log — operational queries
CREATE INDEX CONCURRENTLY idx_audit_log_entity ON audit_log (entity_id, timestamp DESC);
CREATE INDEX CONCURRENTLY idx_audit_log_tenant ON audit_log (tenant_id, timestamp DESC);

-- Passengers
CREATE INDEX CONCURRENTLY idx_passengers_tenant ON passengers (tenant_id);

-- Vehicles
CREATE INDEX CONCURRENTLY idx_vehicles_driver ON vehicles (driver_id) WHERE is_active = TRUE;
