# System Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                                   │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ Passenger   │  │ Driver App  │  │ Web App  │  │ Admin Panel │  │
│  │ App (RN)    │  │ (RN)        │  │ (Next.js)│  │ (Next.js)   │  │
│  └──────┬──────┘  └──────┬──────┘  └────┬─────┘  └──────┬──────┘  │
└─────────┼────────────────┼──────────────┼────────────────┼─────────┘
          │  HTTPS/WSS     │              │                │
          ▼                ▼              ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EDGE / REVERSE PROXY                            │
│                                                                      │
│          ┌────────────────────────────────┐                         │
│          │   AWS ALB + ACM Certificate    │                         │
│          │   Nginx (WebSocket upgrade)    │                         │
│          └────────────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
          │ REST API       │ WebSocket (/ws)
          ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API LAYER (ECS Fargate)                         │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  @tagmytaxi/api — Express.js + Socket.IO                     │  │
│  │  Middleware: JWT auth, tenant resolver, RBAC, rate limiting   │  │
│  │  Routes: /auth /rides /drivers /billing /health              │  │
│  │  WebSocket: /tracking namespace (Socket.IO)                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
          │ gRPC / internal HTTP
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   MICROSERVICES (ECS Fargate)                        │
│                                                                      │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐    │
│  │ Matching Svc   │  │ Tracking Svc    │  │ Billing Svc      │    │
│  │ (CPU-optimised)│  │ (I/O-optimised) │  │ (payment-gateway)│    │
│  └────────┬───────┘  └────────┬────────┘  └────────┬─────────┘    │
└───────────┼───────────────────┼────────────────────┼───────────────┘
            │ Domain Events     │ Pub/Sub            │ Webhook
            ▼                   ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       DATA TIER                                      │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ RDS PostgreSQL   │  │ ElastiCache Redis│  │ AWS EventBridge  │  │
│  │ (Multi-AZ)       │  │ (Pub/Sub + GEO)  │  │ (Event Bus)      │  │
│  │ Rides, Drivers,  │  │ Location index,  │  │ Domain events    │  │
│  │ Passengers,      │  │ Session tokens,  │  │ routing          │  │
│  │ Transactions,    │  │ Rate limits,     │  │                  │  │
│  │ Audit Log        │  │ Tenant cache     │  │                  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `@tagmytaxi/api` | Request routing, authentication, orchestration, WebSocket fan-out |
| `@tagmytaxi/matching-service` | Driver proximity search, scoring, assignment |
| `@tagmytaxi/tracking-service` | GPS ingestion, geospatial index, Pub/Sub fan-out, persistence |
| `@tagmytaxi/billing-service` | Fare calculation, payment processing, refunds |
| RDS PostgreSQL | Authoritative data store for all entities and audit trail |
| ElastiCache Redis | Driver GEO index, location streams, Pub/Sub, session cache |
| EventBridge | Asynchronous domain event routing between services |

## Inter-Service Communication Matrix

| From → To | Protocol | Sync/Async |
|-----------|---------|-----------|
| api → matching | HTTP | Synchronous |
| api → tracking | Redis Pub/Sub | Asynchronous |
| api → billing | HTTP | Synchronous |
| matching → api | Domain Event | Asynchronous |
| tracking → matching | Redis GEO | Read (sync) |
| billing → notifications | Domain Event | Asynchronous |
