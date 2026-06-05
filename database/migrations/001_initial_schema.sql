-- ============================================================
-- Migration: 001 — Initial schema
-- TagMyTaxi Platform v2.0
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- Geospatial support

-- ── Tenants ──────────────────────────────────────────────────────────────────
CREATE TABLE tenants (
    tenant_id       TEXT        PRIMARY KEY,
    brand_name      TEXT        NOT NULL,
    primary_color   TEXT        NOT NULL DEFAULT '#E8000E',
    logo_url        TEXT,
    default_locale  TEXT        NOT NULL DEFAULT 'en-US',
    currency        CHAR(3)     NOT NULL DEFAULT 'AED',
    timezone        TEXT        NOT NULL DEFAULT 'Asia/Dubai',
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Passengers ───────────────────────────────────────────────────────────────
CREATE TABLE passengers (
    passenger_id    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       TEXT        NOT NULL REFERENCES tenants(tenant_id),
    email           TEXT        NOT NULL,
    phone           TEXT        NOT NULL,
    first_name      TEXT        NOT NULL,
    last_name       TEXT        NOT NULL,
    rating          NUMERIC(3,2) NOT NULL DEFAULT 5.0,
    total_rides     INTEGER     NOT NULL DEFAULT 0,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email),
    UNIQUE (tenant_id, phone)
);

-- ── Drivers ──────────────────────────────────────────────────────────────────
CREATE TABLE drivers (
    driver_id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               TEXT        NOT NULL REFERENCES tenants(tenant_id),
    email                   TEXT        NOT NULL,
    phone                   TEXT        NOT NULL,
    first_name              TEXT        NOT NULL,
    last_name               TEXT        NOT NULL,
    status                  TEXT        NOT NULL DEFAULT 'OFFLINE'
                                CHECK (status IN ('OFFLINE', 'AVAILABLE', 'ON_TRIP', 'ON_BREAK', 'SUSPENDED')),
    vehicle_category_id     TEXT        NOT NULL,
    rating                  NUMERIC(3,2) NOT NULL DEFAULT 5.0,
    total_trips             INTEGER     NOT NULL DEFAULT 0,
    license_verification    TEXT        NOT NULL DEFAULT 'PENDING'
                                CHECK (license_verification IN ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED')),
    background_check_status TEXT        NOT NULL DEFAULT 'PENDING'
                                CHECK (background_check_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED')),
    is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email),
    UNIQUE (tenant_id, phone)
);

-- ── Vehicles ─────────────────────────────────────────────────────────────────
CREATE TABLE vehicles (
    vehicle_id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id           UUID    NOT NULL REFERENCES drivers(driver_id),
    tenant_id           TEXT    NOT NULL REFERENCES tenants(tenant_id),
    make                TEXT    NOT NULL,
    model               TEXT    NOT NULL,
    year                SMALLINT NOT NULL,
    color               TEXT    NOT NULL,
    license_plate       TEXT    NOT NULL,
    category_id         TEXT    NOT NULL,
    capacity            SMALLINT NOT NULL DEFAULT 4,
    is_wheelchair_accessible BOOLEAN NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, license_plate)
);

-- ── Rides ────────────────────────────────────────────────────────────────────
CREATE TABLE rides (
    ride_id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           TEXT        NOT NULL REFERENCES tenants(tenant_id),
    passenger_id        UUID        NOT NULL REFERENCES passengers(passenger_id),
    driver_id           UUID        REFERENCES drivers(driver_id),
    status              TEXT        NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PAYMENT_FAILED')),
    vehicle_category_id TEXT        NOT NULL,
    pickup_lat          DOUBLE PRECISION NOT NULL,
    pickup_lng          DOUBLE PRECISION NOT NULL,
    pickup_address      TEXT        NOT NULL,
    dropoff_lat         DOUBLE PRECISION NOT NULL,
    dropoff_lng         DOUBLE PRECISION NOT NULL,
    dropoff_address     TEXT        NOT NULL,
    fare_estimate_id    TEXT,
    final_fare_amount   NUMERIC(10,2),
    currency            CHAR(3)     NOT NULL DEFAULT 'AED',
    distance_meters     INTEGER,
    duration_seconds    INTEGER,
    wait_time_seconds   INTEGER,
    cancellation_reason TEXT,
    cancellation_actor  TEXT        CHECK (cancellation_actor IN ('PASSENGER', 'DRIVER', 'DISPATCHER', 'SYSTEM')),
    promo_code          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);

-- ── Trip Paths (GPS trail) ───────────────────────────────────────────────────
CREATE TABLE trip_paths (
    id          BIGSERIAL   PRIMARY KEY,
    ride_id     UUID        NOT NULL REFERENCES rides(ride_id),
    driver_id   UUID        NOT NULL REFERENCES drivers(driver_id),
    location    GEOMETRY(POINT, 4326) NOT NULL,
    bearing     SMALLINT,
    speed_kmh   NUMERIC(6,2),
    captured_at TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (captured_at);

-- Monthly partitions for trip_paths
CREATE TABLE trip_paths_2024_01 PARTITION OF trip_paths
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- ── Transactions ─────────────────────────────────────────────────────────────
CREATE TABLE transactions (
    transaction_id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               TEXT        NOT NULL REFERENCES tenants(tenant_id),
    ride_id                 UUID        NOT NULL REFERENCES rides(ride_id),
    passenger_id            UUID        NOT NULL REFERENCES passengers(passenger_id),
    amount                  NUMERIC(10,2) NOT NULL,
    currency                CHAR(3)     NOT NULL,
    status                  TEXT        NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
    payment_gateway         TEXT        NOT NULL,
    gateway_transaction_id  TEXT,
    idempotency_key         TEXT        NOT NULL UNIQUE,
    processed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Audit Log ────────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
    id          BIGSERIAL   PRIMARY KEY,
    tenant_id   TEXT        NOT NULL,
    event       TEXT        NOT NULL,
    entity_id   TEXT        NOT NULL,
    payload     JSONB       NOT NULL DEFAULT '{}',
    actor_id    TEXT,
    ip_address  INET,
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

CREATE TABLE audit_log_2024_q1 PARTITION OF audit_log
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

-- Update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_passengers_updated_at BEFORE UPDATE ON passengers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON rides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
