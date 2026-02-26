# HELIXCRM Security Architecture

**Last Updated:** 2026-01-27  
**Status:** Production – MVP v1.0

---

## 1. Security Objectives

HELIXCRM is designed as a multi-tenant, enterprise-grade platform with the following security goals:

- Strict tenant isolation
- Least-privilege access control
- Defense in depth
- Secure-by-default API design
- Auditable access patterns

---

## 2. Security Layers Overview

| Layer | Technology |
|-------|-----------|
| Authentication | JWT (access + refresh tokens) |
| Authorization | Role-Based Access Control (RBAC) |
| Data Isolation | PostgreSQL Row-Level Security (RLS) |
| Request Protection | CSRF tokens |
| Abuse Protection | Rate limiting |
| Transport | HTTPS (TLS) |
| Input Safety | DTO validation (class-validator) |

---

## 3. Authentication (JWT)

### Flow
1. User logs in
2. Server validates credentials
3. JWT issued with:
   - userId
   - organizationId
   - roles
   - permissions (flattened)

### Token Types
- Access token (short-lived)
- Refresh token (longer-lived, rotating)

### Storage
- HTTP-only cookies (recommended)
- Authorization header supported for API clients

---

## 4. Authorization (RBAC)

### Model

User → UserRole → Role → RolePermission → Permission


### Permission format

Standardized:

module.action


Examples:

users.read
users.create
deals.update
contacts.delete


### Enforcement

- `@RequirePermission()` decorator on controllers
- `PermissionGuard` validates permissions from JWT
- Cached per request lifecycle

---

## 5. Multi-Tenant Isolation (RLS)

### Strategy

PostgreSQL Row-Level Security enforces:

organization_id = current_setting('app.current_organization')


### Enforcement Points

- Every DB connection sets organization context
- Prisma queries automatically filtered
- Cannot be bypassed at application level

### Verified

- Tested with 2 organizations
- No data leakage across:
  - users
  - contacts
  - deals
  - pipelines
  - analytics

---

## 6. CSRF Protection

- Token generated via: `/api/v1/auth/csrf-token`
- Required for:
  - POST
  - PUT
  - PATCH
  - DELETE
- Header: `X-CSRF-Token`

---

## 7. Rate Limiting

Applied globally:

- Per-IP throttling
- Protects auth endpoints
- Prevents brute force

---

## 8. Input Validation

- DTO validation using `class-validator`
- Whitelisting enabled
- Unknown fields stripped
- Type coercion disabled

---

## 9. Audit & Logging

- Authentication attempts logged
- Permission failures logged
- Tenant context included in logs
- Ready for SIEM integration

---

## 10. Known Security Limitations (MVP)

| Area | Status |
|------|--------|
| MFA | Not implemented |
| IP allowlisting | Not implemented |
| Session revocation | Partial |
| Admin activity dashboard | Planned |
| SOC2 compliance | Not certified |

---

## 11. Security Testing

Completed:

- Authentication gate test
- Tenant isolation test
- RBAC enforcement test
- CSRF enforcement test
- Permission caching verification

See: `docs/api/mvp-api-status.md`

---

## 12. Future Hardening (Phase 2)

- MFA (TOTP)
- API key support
- Device fingerprinting
- Audit log persistence
- Admin security dashboard
- Secrets rotation
- Zero-trust internal services

---

**Security posture:** Strong for MVP, production-capable for controlled environments.

