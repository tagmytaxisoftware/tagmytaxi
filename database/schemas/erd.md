# Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   tenants   │──1:N──│  passengers │──1:N──│    rides    │
│─────────────│       │─────────────│       │─────────────│
│ tenant_id   │       │ passenger_id│       │ ride_id     │
│ brand_name  │       │ tenant_id   │       │ tenant_id   │
│ currency    │       │ email       │       │ passenger_id│
│ ...         │       │ phone       │       │ driver_id   │
└─────────────┘       │ rating      │       │ status      │
       │              └─────────────┘       │ pickup_*    │
       │                                    │ dropoff_*   │
       │1:N                                 │ fare_*      │
       ▼                                    └─────────────┘
┌─────────────┐                                    │1:1
│   drivers   │──────────────────────────────────►│
│─────────────│       ┌─────────────┐             │
│ driver_id   │──1:N──│  vehicles   │    ┌─────────────────┐
│ tenant_id   │       │─────────────│    │   trip_paths    │
│ status      │       │ vehicle_id  │    │─────────────────│
│ rating      │       │ driver_id   │    │ ride_id         │
│ ...         │       │ make/model  │    │ location (GEO)  │
└─────────────┘       │ license_*   │    │ bearing, speed  │
                      └─────────────┘    │ captured_at     │
                                         └─────────────────┘
┌─────────────────┐
│  transactions   │
│─────────────────│
│ transaction_id  │
│ ride_id         │
│ amount/currency │
│ gateway         │
│ status          │
└─────────────────┘
```

## Key Design Decisions

- `trip_paths` is partitioned by `captured_at` (monthly) to bound query scope for billing and safety investigations.
- `audit_log` is partitioned quarterly and append-only — no UPDATE or DELETE is ever permitted.
- `transactions.idempotency_key` has a unique constraint to prevent duplicate charges at the database level (belt-and-suspenders with the application-level idempotency key).
- `rides.status` is enforced at the DB level via CHECK constraints but the primary state machine lives in the API to allow rich error messaging.
- All `tenant_id` foreign keys use TEXT rather than UUID to allow human-readable tenant identifiers matching the `tenant.config.json` format.
