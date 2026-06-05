# Threat Model — STRIDE Analysis

## Assets

| Asset | Classification | Owner |
|-------|---------------|-------|
| Passenger PII (email, phone, location) | Confidential | Data Protection Officer |
| Driver PII (license, background check) | Confidential | Data Protection Officer |
| Payment card tokens | Restricted | Finance / Stripe |
| JWT signing secret | Restricted | Platform Engineering |
| Database credentials | Restricted | Platform Engineering |
| Trip GPS path data | Internal | Operations |

## STRIDE Threat Matrix

### S — Spoofing

| Threat | Scenario | Likelihood | Impact | Control |
|--------|---------|-----------|--------|---------|
| S1 | Attacker obtains a valid JWT and impersonates a passenger | Medium | High | Short JWT TTL (15 min), token rotation, JTI revocation |
| S2 | Driver spoofs GPS location to fake trip completion | Medium | High | Server-side path validation, speed plausibility checks |
| S3 | Multi-tenant data leak via forged `X-Tenant-Id` header | Low | Critical | Tenant config cached server-side; header alone doesn't bypass DB-level tenant isolation |

### T — Tampering

| Threat | Scenario | Likelihood | Impact | Control |
|--------|---------|-----------|--------|---------|
| T1 | Passenger tampers with fare estimate ID to underpay | Low | Medium | Fare estimate signed with HMAC; amount validated server-side before charge |
| T2 | Payment webhook replay attack | Medium | High | Stripe webhook signature verification; idempotency key unique constraint in DB |

### R — Repudiation

| Threat | Scenario | Likelihood | Impact | Control |
|--------|---------|-----------|--------|---------|
| R1 | Driver denies completing a trip | Low | Medium | Immutable GPS path record in `trip_paths`; driver app signs location updates |
| R2 | Passenger disputes a charge | Medium | Medium | Audit log with full transaction chain; Stripe dispute evidence includes trip path |

### I — Information Disclosure

| Threat | Scenario | Likelihood | Impact | Control |
|--------|---------|-----------|--------|---------|
| I1 | Stack traces exposed in API error responses | Low | Low | `errorHandler` strips stack traces in production |
| I2 | PII leakage in application logs | Low | High | Log sanitisation middleware; no PII in structured log fields |
| I3 | Cross-tenant data exposure via SQL injection | Very Low | Critical | Parameterised queries only; TypeScript strict mode prevents untyped string interpolation |

### D — Denial of Service

| Threat | Scenario | Likelihood | Impact | Control |
|--------|---------|-----------|--------|---------|
| D1 | Flood of fake ride requests exhausting matching service | Medium | High | Per-IP rate limiting at Nginx (30 req/min); per-account rate limiting at API |
| D2 | Redis memory exhaustion via location update spam | Low | High | Stream max-length trimming (`MAXLEN ~10000` per driver) |

### E — Elevation of Privilege

| Threat | Scenario | Likelihood | Impact | Control |
|--------|---------|-----------|--------|---------|
| E1 | Passenger-role token used to access admin endpoints | Low | Critical | RBAC `requirePermission` middleware on every admin route; JWT role claim is server-issued and cannot be modified by client |
| E2 | Driver app bypasses backend to directly write to DB | Very Low | Critical | DB credentials never leave the backend service; mobile apps only hold JWT tokens |

## Residual Risk

All residual risks are accepted by the Chief Security Officer and reviewed quarterly. The next review date is **2026-09-01**.
