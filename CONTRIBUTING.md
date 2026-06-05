# Contributing to TagMyTaxi Platform

Thank you for your interest in contributing. This document covers the development workflow for internal and partner contributors.

## Development Setup

### Prerequisites

- Node.js 20+ (use `.nvmrc` via `nvm use`)
- npm 10+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker Compose)
- Redis 7 (or use Docker Compose)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/PixelSanctuary/tagmytaxi.git
cd tagmytaxi

# Install all workspace dependencies
npm install

# Start infrastructure services
docker-compose up -d postgres redis

# Build all packages
npm run build

# Run tests
npm test
```

## Monorepo Structure

This is a Turborepo monorepo. Packages live in `packages/`, services in `services/`.

| Path | Package | Description |
|------|---------|-------------|
| `packages/shared` | `@tagmytaxi/shared` | Cross-package TypeScript types, interfaces, utilities |
| `packages/api` | `@tagmytaxi/api` | Node.js/Express REST API + Socket.IO |
| `packages/web-app` | `@tagmytaxi/web-app` | Passenger web app (Next.js) |
| `packages/admin-panel` | `@tagmytaxi/admin-panel` | Admin dashboard (Next.js) |
| `packages/dispatcher-panel` | `@tagmytaxi/dispatcher-panel` | Dispatcher console (Next.js) |
| `packages/passenger-app` | `@tagmytaxi/passenger-app` | Passenger mobile app (React Native) |
| `packages/driver-app` | `@tagmytaxi/driver-app` | Driver mobile app (React Native) |
| `services/matching-service` | `@tagmytaxi/matching-service` | Ride–driver matching engine |
| `services/tracking-service` | `@tagmytaxi/tracking-service` | Real-time GPS tracking |
| `services/billing-service` | `@tagmytaxi/billing-service` | Fare calculation & payments |

## Branching Strategy

- `main` — production-ready code; protected, requires PR + passing CI
- `develop` — integration branch; all feature PRs merge here first
- `feature/<scope>/<description>` — feature branches
- `fix/<scope>/<description>` — bug-fix branches
- `chore/<description>` — maintenance branches

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `revert`

**Scopes:** `shared`, `api`, `web-app`, `passenger-app`, `driver-app`, `admin-panel`, `dispatcher-panel`, `matching`, `tracking`, `billing`, `infra`, `docs`, `ci`, `deps`

Commit messages are validated by `commitlint` on every commit via Husky.

## Pull Request Process

1. Create a branch from `develop`
2. Make your changes (tests required for all service logic)
3. Ensure `npm run build && npm test && npm run lint` all pass
4. Open a PR using the PR template
5. Two approvals required for `services/` changes; one for `packages/`
6. Squash merge only

## Code Standards

- TypeScript strict mode is enforced — no `any`, no implicit `any`
- All public interfaces and abstract classes must have TSDoc
- Service implementations must have Jest unit tests
- No hardcoded secrets or credentials — use environment variables
- Follow the existing file naming conventions (`PascalCase` for classes, `camelCase` for utilities)

## Multi-Tenant Configuration

Each deployment is configured via `tenant.config.json`. See `tenant.config.schema.json` for the full schema. Do not commit real tenant configurations to this repository.

## Security

Report security vulnerabilities privately to **security@tagmytaxi.ae**. See [SECURITY.md](security/SECURITY.md) for the full responsible disclosure policy.
