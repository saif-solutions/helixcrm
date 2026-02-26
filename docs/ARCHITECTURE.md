# HelixCRM Architecture

## System Overview
HelixCRM is a modular, API-first, multi-tenant CRM platform designed for:
- SaaS deployment
- Organizational data isolation  
- Enterprise-grade security
- Horizontal scalability

## High-Level Architecture
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

text

## Technology Stack
| Layer | Technology |
|-------|------------|
| Backend | NestJS (TypeScript) |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT |
| Authorization | RBAC |
| Isolation | Row-Level Security |
| Validation | class-validator |
| Runtime | Node.js |

## Core Modules
| Module | Purpose |
|--------|---------|
| Auth | Registration, login, tokens, CSRF |
| Users | User management |
| RBAC | Roles & permissions |
| Contacts | CRM contacts |
| Deals | Sales pipeline |
| Pipelines | Deal stages |
| Analytics | Aggregated metrics |
| Dashboard | KPIs |

## Modularization Strategy
Refer to SSOT.md §5 for the complete modularization strategy.

### Key Principles:
- **Module Independence**: Each module is independently runnable and versioned
- **API Contracts**: Clear boundaries with defined interfaces
- **Configuration-driven**: No client-specific forks
- **Product Units**: Modules correspond to independently saleable product units

### Target Modules (Post MVP-1):
- `auth-core` - Authentication foundation
- `auth-security` - Security enhancements
- `tenant-core` - Multi-tenant management
- `crm-basic` - Core CRM functionality
- `admin-dashboard` - Administration interface
- `branding-engine` - White-label theming
- `i18n-engine` - Internationalization

## Multi-Tenant Design
Each organization has isolated:
- Users
- Roles  
- Data
- Analytics

Isolation enforced at:
- Application level (JWT context)
- Database level (RLS)

## Request Lifecycle
1. Request arrives
2. JWT validated  
3. Tenant context injected
4. Permission guard executed
5. Controller logic runs
6. Prisma query filtered by RLS
7. Response returned

## Data Model Principles
- Every business entity includes:
  - `id`
  - `organizationId`
  - `createdAt`, `updatedAt`
- Soft deletes optional
- No cross-tenant foreign keys

## Scalability Strategy
**Current:**
- Vertical scaling
- Stateless API nodes

**Future:**
- Horizontal scaling
- Redis caching
- Read replicas
- Message queue (events)
- API gateway

## Deployment Model
**MVP:**
- Single API service
- Single PostgreSQL instance

**Production-ready for:**
- Docker containers
- Kubernetes orchestration
- Managed PostgreSQL services

## Architectural Constraints
- Single-region deployment (MVP)
- No offline mode
- No plugin system (MVP)
- REST API only

## Evolution Path
See SSOT.md §3.2 for modularization strategy and future expansion plans.
