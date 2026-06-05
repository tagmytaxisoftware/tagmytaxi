# TagMyTaxi Platform

> White-label ride-hailing SaaS platform — production-grade, multi-tenant, microservices architecture.

An enterprise-grade, fully configurable white-label ride-hailing platform powering taxi companies, ride-hailing startups, corporate shuttle services, and rental fleets worldwide.

---

## Platform Overview

TagMyTaxi delivers a complete end-to-end ride-hailing ecosystem:

| Component | Technology | Description |
|-----------|-----------|-------------|
| Passenger App | React Native (iOS + Android) | Book, track, and pay for rides |
| Driver App | React Native (iOS + Android) | Accept rides, navigate, track earnings |
| Web App | Next.js 14 + TypeScript | Browser-based booking and tracking |
| Admin Dashboard | Next.js 14 + TypeScript | Fleet management, analytics, configuration |
| Dispatch Console | Next.js 14 + Socket.IO | Real-time ride assignment and driver monitoring |
| REST API | Node.js + Express + TypeScript | Core business logic and orchestration |
| Matching Service | TypeScript (microservice) | Geospatial driver-ride matching engine |
| Tracking Service | TypeScript + Redis Pub/Sub | Real-time GPS tracking pipeline |
| Billing Service | TypeScript + Stripe/PayPal | Fare calculation and payment processing |

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React.js · Next.js 14 · TypeScript · Redux Toolkit · Tailwind CSS · Material UI |
| Mobile | React Native · iOS · Android |
| Backend | Node.js · Express.js · TypeScript · REST API · Socket.IO |
| Database | PostgreSQL 16 (PostGIS) · Redis 7 |
| Real-Time | Socket.IO · WebSockets · Redis Pub/Sub |
| Maps | Google Maps API · Geolocation Services |
| Auth & Security | JWT · OAuth 2.0 · RBAC |
| Cloud & DevOps | AWS · ECS Fargate · Docker · Nginx · GitHub Actions · Terraform |
| Payments | Stripe · PayPal · Tap · Telr |
| Notifications | Firebase Cloud Messaging · Twilio SMS · Email |
| Analytics | Google Analytics · Sentry · Structured Logging |
| Testing | Jest · React Testing Library · Playwright · k6 |
| Architecture | Microservices · Event-Driven Design · Multi-Tenant SaaS |

---

## Repository Structure

```
tagmytaxi/
├── packages/
│   ├── shared/            # @tagmytaxi/shared — TypeScript types, interfaces, utilities
│   ├── api/               # REST API (Express.js + Socket.IO)
│   ├── web-app/           # Passenger web app (Next.js 14)
│   ├── admin-panel/       # Admin dashboard (Next.js 14)
│   ├── dispatcher-panel/  # Dispatch console (Next.js 14 + real-time)
│   ├── passenger-app/     # Passenger mobile app (React Native)
│   └── driver-app/        # Driver mobile app (React Native)
├── services/
│   ├── matching-service/  # Ride-driver matching engine
│   ├── tracking-service/  # Real-time GPS tracking pipeline
│   └── billing-service/   # Fare calculation + payment processing
├── database/
│   ├── migrations/        # PostgreSQL migrations (PostGIS, partitioned tables)
│   └── seeds/             # Demo data for development
├── deployment/
│   ├── docker/            # Nginx config, multi-stage Dockerfiles
│   ├── kubernetes/        # Kustomize base + overlays (staging/production)
│   └── terraform/         # AWS infrastructure (ECS, RDS, ElastiCache, VPC)
├── integrations/          # Google Maps, Stripe, Firebase, Twilio
├── docs/
│   ├── adr/               # Architecture Decision Records
│   ├── architecture/      # System overview, data flow diagrams
│   └── api/               # OpenAPI 3.1 specification
├── security/              # SECURITY.md + STRIDE threat model
├── testing/               # k6 load tests, Postman collection, E2E docs
├── tenant.config.json     # Multi-tenant configuration example
├── tenant.config.schema.json  # JSON Schema for IDE validation
├── docker-compose.yml     # Full stack local development
└── turbo.json             # Turborepo build pipeline
```

---

## Multi-Tenant Architecture

Each white-label deployment is driven by a `tenant.config.json` file. Tenants are fully isolated at the API, service, and database levels — no cross-tenant data leakage is architecturally possible.

Key tenant configuration capabilities:
- **Branding**: logo, primary colour, custom domain
- **Locale & currency**: multi-language including RTL (Arabic)
- **Feature flags**: scheduled rides, ride sharing, loyalty, tipping, SOS
- **Payment gateways**: Stripe, PayPal, Tap, Telr (per-tenant selection)
- **SLA targets**: driver assignment timeout, minimum driver rating, search radius
- **RBAC roles**: PASSENGER, DRIVER, DISPATCHER, FLEET_MANAGER, ADMIN

See [`tenant.config.schema.json`](tenant.config.schema.json) for the complete validated schema.

---

## Service Architecture

The three core operational loops are isolated microservices with clean interface contracts:

```
IMatchingService       →   AbstractMatchingService   →   [Production Implementation]
ITrackingService       →   AbstractTrackingService   →   [Production Implementation]
IBillingService        →   AbstractBillingService    →   [Production Implementation]
```

This architecture enables:
- **Independent scaling** per service (matching is CPU-bound; tracking is I/O-bound)
- **Swap-in implementations** — replace any service implementation without touching the API layer
- **Full testability** — `MockMatchingService`, `MockTrackingService`, `MockBillingService` enable deterministic unit tests without external dependencies

---

## Getting Started

### Prerequisites

- Node.js 20+ (`nvm use` reads `.nvmrc`)
- Docker and Docker Compose
- npm 10+

### Local Development

```bash
# Clone and install
git clone https://github.com/PixelSanctuary/tagmytaxi.git
cd tagmytaxi
npm install

# Start infrastructure (PostgreSQL + Redis)
docker-compose up -d postgres redis

# Build shared types (prerequisite for all other packages)
npm run build --workspace=packages/shared

# Start full stack (all apps hot-reload)
npm run dev
```

### Run Tests

```bash
npm test
# With coverage
npm test -- --coverage
```

### Run Full Stack with Docker

```bash
docker-compose up --build
```

Services:
- Web app: http://localhost:3000
- API: http://localhost:3001
- API docs: http://localhost:3001/health

---

## API Documentation

The full OpenAPI 3.1 specification is at [`docs/api/openapi.yaml`](docs/api/openapi.yaml).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/login` | POST | Authenticate, issue JWT |
| `/api/v1/auth/refresh` | POST | Refresh access token |
| `/api/v1/rides` | POST | Create ride request |
| `/api/v1/rides/:id` | GET | Get ride details |
| `/api/v1/rides/:id/cancel` | PATCH | Cancel a ride |
| `/api/v1/rides/:id/track` | GET | Server-Sent Events location stream |
| `/api/v1/drivers` | GET | List drivers (fleet manager) |
| `/api/v1/billing/estimate` | POST | Calculate fare estimate |
| `/api/v1/billing/charge` | POST | Process payment |
| `/ws/tracking` | WebSocket | Real-time driver location |

---

## Deployment

### Staging

Merges to `main` trigger automatic deployment to AWS ECS Fargate via GitHub Actions (`deploy-staging.yml`).

### Production

Production deployments are triggered manually via the `deploy-production` workflow with required approval gate.

### Infrastructure (Terraform)

```bash
cd deployment/terraform
terraform init
terraform workspace select production
terraform plan -var="environment=production"
terraform apply
```

AWS resources provisioned: ECS Fargate cluster, RDS PostgreSQL 16 (Multi-AZ), ElastiCache Redis 7, Application Load Balancer, ACM certificate, Route53, ECR repositories, VPC with public/private subnets.

---

## Security

- JWT authentication with 15-minute access token TTL
- RBAC enforced on every API route via `requirePermission` middleware
- Multi-tenant data isolation at API and database layers
- All data encrypted at rest (AES-256) and in transit (TLS 1.2+)
- PCI SAQ-A compliance — no raw card data stored (Stripe tokenisation)
- STRIDE threat model: [`security/threat-model.md`](security/threat-model.md)

To report a security vulnerability: **security@tagmytaxi.ae**  
See [`security/SECURITY.md`](security/SECURITY.md) for the full responsible disclosure policy.

---

## White-Label Licensing

TagMyTaxi is available for white-label licensing to enterprise accounts. The platform supports full brand customisation, custom domain deployment, and dedicated infrastructure.

**Contact**: sales@tagmytaxi.ae  
**Website**: https://tagmytaxi.ae  
**Demo**: https://tagmytaxi.ae/demo

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, commit convention, and code standards.

---

© 2024–2026 TagMyTaxi Software. All rights reserved. See [LICENSE](LICENSE) for terms.
