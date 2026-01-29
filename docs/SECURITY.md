# HelixCRM Security Architecture

## Security Objectives
HelixCRM is designed as a multi-tenant, enterprise-grade platform with:
- Strict tenant isolation
- Least-privilege access control
- Defense in depth
- Secure-by-default API design
- Auditable access patterns

## Security Layers
| Layer | Technology |
|-------|-----------|
| Authentication | JWT (access + refresh tokens) |
| Authorization | Role-Based Access Control (RBAC) |
| Data Isolation | PostgreSQL Row-Level Security (RLS) |
| Request Protection | CSRF tokens |
| Abuse Protection | Rate limiting |
| Transport | HTTPS (TLS) |
| Input Safety | DTO validation (class-validator) |

## Authentication (JWT)
### Flow
1. User credentials validated
2. JWT issued with: userId, organizationId, roles, permissions
3. Token stored in HTTP-only cookies (recommended)

### Token Types
- **Access token**: Short-lived (15-30 minutes)
- **Refresh token**: Longer-lived, rotating

## Authorization (RBAC)
### Model
User → UserRole → Role → RolePermission → Permission

### Permission Format
Standardized: `module.action`
Examples: `users.read`, `deals.create`, `contacts.delete`

### Enforcement
- `@RequirePermission()` decorator on controllers
- `PermissionGuard` validates permissions from JWT
- Cached per request lifecycle

## Multi-Tenant Isolation (RLS)
### Strategy
PostgreSQL Row-Level Security enforces:
`organization_id = current_setting('app.current_organization')`

### Verified Isolation
- Tested with 2 organizations
- No data leakage across: users, contacts, deals, pipelines, analytics

## CSRF Protection
- Token generated via: `/api/v1/auth/csrf-token`
- Required for: POST, PUT, PATCH, DELETE
- Header: `X-CSRF-Token`

## Rate Limiting
- Global per-IP throttling
- Protects authentication endpoints
- Prevents brute-force attacks

## Input Validation
- DTO validation using `class-validator`
- Whitelisting enabled
- Unknown fields stripped
- Type coercion disabled

## Audit & Logging
- Authentication attempts logged
- Permission failures logged
- Tenant context included in logs
- SIEM integration ready

## Security Testing
Completed validations:
- Authentication gate test
- Tenant isolation test
- RBAC enforcement test
- CSRF enforcement test
- Permission caching verification

## Known Limitations (MVP)
| Area | Status |
|------|--------|
| MFA | Not implemented |
| IP allowlisting | Not implemented |
| Session revocation | Partial |
| Admin security dashboard | Planned |
| SOC2 compliance | Not certified |

## Future Hardening
- MFA (TOTP)
- API key support
- Device fingerprinting
- Audit log persistence
- Secrets rotation
- Zero-trust internal services

**Security Posture**: Strong for MVP, production-capable for controlled environments.
