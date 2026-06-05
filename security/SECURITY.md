# Security Policy

## Supported Versions

| Version | Security Updates |
|---------|----------------|
| 2.x     | ✅ Active support |
| 1.x     | ❌ End of life |

## Reporting a Vulnerability

**Do not create a public GitHub issue for security vulnerabilities.**

Report security vulnerabilities privately to: **security@tagmytaxi.ae**

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any suggested remediation

We will acknowledge your report within **48 hours** and provide a timeline for a fix within **7 days**. Critical vulnerabilities are typically patched within **72 hours**.

We follow coordinated disclosure: we ask that you do not disclose the vulnerability publicly until we have released a patch.

## Security Architecture

### Authentication
- JWT access tokens with 15-minute TTL
- Refresh tokens stored server-side (Redis) with 30-day TTL, rotated on each use
- Token revocation via JTI blocklist in Redis
- OAuth 2.0 (Google, Apple) for social login

### Authorisation
- Role-Based Access Control (RBAC) with fine-grained `Permission` enum
- All API routes declare required permissions explicitly
- Tenant isolation enforced at middleware level — cross-tenant data access is architecturally impossible

### Data Protection
- All data encrypted at rest (AES-256 via RDS/EBS encryption)
- All data encrypted in transit (TLS 1.2+, HSTS enforced)
- PII fields (email, phone) are not logged — only hashed identifiers appear in logs
- No raw card data is stored — all payment tokenisation delegated to Stripe/gateway

### Infrastructure
- All services run in a private VPC subnet; no direct internet access
- ALB terminates TLS; backend services only accept HTTP within the VPC
- Security Groups follow least-privilege: each service only accepts traffic from authorised upstreams
- ECR images scanned on push via AWS Inspector

### Dependency Management
- `npm audit` runs on every CI pipeline execution
- Dependabot security updates are auto-merged for patch versions
- OWASP Dependency Check runs weekly in the `security-scan.yml` workflow
