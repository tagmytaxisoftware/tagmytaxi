-- ============================================================
-- Seed: 001 — Demo tenants
-- For development and demo environments only
-- ============================================================

INSERT INTO tenants (tenant_id, brand_name, primary_color, logo_url, default_locale, currency, timezone, is_active)
VALUES
  ('cityride-dubai',   'CityRide Dubai',   '#1A73E8', 'https://cdn.cityride.ae/logo.png',   'ar-AE', 'AED', 'Asia/Dubai',  TRUE),
  ('quikride-riyadh',  'QuikRide',         '#22C55E', 'https://cdn.quikride.sa/logo.png',   'ar-SA', 'SAR', 'Asia/Riyadh', TRUE),
  ('demo-tenant',      'TagMyTaxi Demo',   '#E8000E', 'https://tagmytaxi.ae/logo.png',      'en-US', 'AED', 'Asia/Dubai',  TRUE)
ON CONFLICT (tenant_id) DO NOTHING;
