# Architecture Decisions

## ADR-001: Modular Monolith Pattern
**Context:** Need to balance development speed with future scalability
**Decision:** Use NestJS modular monolith with Clean Architecture principles
**Consequences:** 
- Easy to extract modules into microservices later
- Clear separation of concerns
- Maintainable as codebase grows

## ADR-002: Multi-tenancy Strategy
**Context:** Multiple organizations on single deployment
**Decision:** Shared database with organization_id + application-level security (Phase 1)
**Future:** Database-level RLS (Phase 2)
**Reasoning:** Simpler implementation first, enhance security incrementally

## ADR-003: Technology Stack
### Backend
- **Framework:** NestJS (TypeScript)
- **ORM:** Prisma 5.x
- **Validation:** Class Validator

### Database
- **Primary:** PostgreSQL 15
- **Cache:** Redis 7
- **Migrations:** Prisma Migrate

### Infrastructure
- **Container:** Docker + Docker Compose
- **Monorepo:** Turborepo
- **CI/CD:** GitHub Actions (ready)

## ADR-004: Security Architecture
**Layered Security Approach:**
1. **Application Layer:** Authentication, RBAC, input validation
2. **Service Layer:** Business logic validation, audit logging
3. **Data Layer:** Database permissions, RLS (future)

## ADR-005: Error Handling
**Context:** Need consistent error responses
**Decision:** Global exception filter with structured error format
**Format:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "timestamp": "2026-01-06T15:30:00Z"
}
ADR-006: API Design
RESTful Principles:

Resource-based URLs

Proper HTTP methods

Consistent response formats

Versioning ready (v1/ prefix available)

Directory Structure
helixcrm/
├── apps/
│   ├── api/                 # Backend API
│   └── web/                 # Frontend (future)
├── packages/               # Shared packages
├── docker/                # Docker configurations
├── docs/                  # Documentation
└── scripts/               # Utility scripts

