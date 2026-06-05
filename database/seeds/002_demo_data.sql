-- ============================================================
-- Seed: 002 — Demo drivers and passengers (non-sensitive placeholder data)
-- For development and demo environments only
-- ============================================================

INSERT INTO drivers (driver_id, tenant_id, email, phone, first_name, last_name, status, vehicle_category_id, rating, total_trips, license_verification, background_check_status)
VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'demo-tenant', 'ahmed.rashidi@demo.ae',   '+971501111001', 'Ahmed',   'Al Rashidi', 'AVAILABLE', 'economy', 4.9, 1842, 'VERIFIED', 'VERIFIED'),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'demo-tenant', 'fatima.alali@demo.ae',    '+971501111002', 'Fatima',  'Al Ali',     'AVAILABLE', 'comfort', 4.8, 976,  'VERIFIED', 'VERIFIED'),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'demo-tenant', 'carlos.mendes@demo.ae',   '+971501111003', 'Carlos',  'Mendes',     'OFFLINE',   'economy', 4.7, 3201, 'VERIFIED', 'VERIFIED')
ON CONFLICT DO NOTHING;

INSERT INTO passengers (passenger_id, tenant_id, email, phone, first_name, last_name, rating, total_rides)
VALUES
  ('b2c3d4e5-0001-0001-0001-000000000001', 'demo-tenant', 'john.doe@demo.com',    '+971509990001', 'John',   'Doe',    4.9, 45),
  ('b2c3d4e5-0002-0002-0002-000000000002', 'demo-tenant', 'sarah.lee@demo.com',   '+971509990002', 'Sarah',  'Lee',    5.0, 12),
  ('b2c3d4e5-0003-0003-0003-000000000003', 'demo-tenant', 'khalid.omar@demo.ae',  '+971509990003', 'Khalid', 'Omar',   4.8, 230)
ON CONFLICT DO NOTHING;
