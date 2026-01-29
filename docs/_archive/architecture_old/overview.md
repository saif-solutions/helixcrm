# HELIXCRM System Architecture

**Last Updated:** 2026-01-27  
**Version:** MVP v1.0

---

## 1. Platform Overview

HELIXCRM is a modular, API-first, multi-tenant CRM platform designed for:

- SaaS deployment
- Organizational data isolation
- Enterprise-grade security
- Horizontal scalability

---

## 2. High-Level Architecture

Clients (Web / Mobile / API)
|
v
API Gateway / NestJS Server
|
v
Authorization & Guards
|
v
Business Modules
|
v
Prisma ORM
|
v
PostgreSQL (RLS Enabled)


---

## 3. Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS (TypeScript) |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT |
| Authorization | RBAC |
| Isolation | Row-Level Security |
| Validation | class-validator |
| Docs | Markdown |
| Runtime | Node.js |

---

## 4. Core Modules

| Module | Purpose |
|--------|---------|
| Auth | Registration, login, tokens, CSRF |
| Users | User management |
| RBAC | Roles & permissions |
| Contacts | CRM contacts |
| Leads | Sales leads |
| Deals | Sales pipeline |
| Pipelines | Deal stages |
| Analytics | Aggregated metrics |
| Dashboard | KPIs |

---

## 5. Multi-Tenant Design

Each organization has:

- Isolated users
- Isolated roles
- Isolated data
- Isolated analytics

Isolation enforced at:

- Application level (JWT context)
- Database level (RLS)

---

## 6. Request Lifecycle

1. Request arrives
2. JWT validated
3. Tenant context injected
4. Permission guard executed
5. Controller logic runs
6. Prisma query filtered by RLS
7. Response returned

---

## 7. Data Model Principles

- Every business entity has:
  - `id`
  - `organizationId`
  - timestamps
- Soft deletes optional
- No cross-tenant foreign keys

---

## 8. Scalability Strategy

Current:

- Vertical scaling
- Stateless API nodes

Future:

- Horizontal scaling
- Redis caching
- Read replicas
- Message queue (events)
- API gateway

---

## 9. Deployment Model

MVP:

- Single API service
- Single PostgreSQL instance

Production-ready for:

- Docker
- Kubernetes
- Managed Postgres

---

## 10. Observability

Planned:

- Structured logging
- Metrics (Prometheus)
- Tracing (OpenTelemetry)
- Health endpoints

Current:

- Health endpoint
- Request logs
- Error logs

---

## 11. Architectural Constraints

- Single-region deployment (MVP)
- No offline mode
- No plugin system yet
- REST API only

---

## 12. Evolution Path

Phase 2:

- Frontend SPA
- Task management
- Document storage
- Advanced reporting
- Workflow automation
- Public API keys

---

**Architecture status:** Stable foundation for production SaaS expansion.

