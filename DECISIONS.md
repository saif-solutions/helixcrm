# Architectural Decisions Log

## Purpose

This document records irreversible architectural decisions for HelixCRM.
Each decision is made, documented, and never re-argued without new data.

## Format

- **Date**: When decision was made
- **Decision**: What was decided
- **Context**: Why it was needed
- **Consequences**: What this enables/prevents
- **Status**: Active/Deprecated/Superseded

---

## Decision 1: Single Source of Truth Documentation

**Date**: 2026-01-30  
**Decision**: All documentation anchored to `docs/SSOT.md` as constitutional document.  
**Context**: Documentation sprawl caused confusion, duplication, and onboarding delays.  
**Consequences**:

- ✅ Clear authority chain (SSOT > all other docs)
- ✅ No duplicate explanations
- ✅ Historical docs archived, not deleted
- ✅ New engineers onboard in hours, not days  
  **Status**: ✅ Active

## Decision 2: Scripts & Tests Centralization

**Date**: 2026-01-30  
**Decision**: All non-runtime code (scripts, tests, tooling, configs) moved to dedicated root directories.  
**Context**: Scripts scattered across apps/ caused maintenance issues and blocked modularization.  
**Consequences**:

- ✅ Clean separation: apps/ = runtime, scripts/ = operations
- ✅ Safe modularization path
- ✅ Enterprise-grade organization
- ✅ White-label deployment ready  
  **Status**: ✅ Active

## Decision 3: Environment Variable Governance

**Date**: 2026-01-30  
**Decision**: Environment configuration centralized in `/configs/env/` with strict documentation.  
**Context**: Inconsistent env handling blocked multi-client deployments and caused security issues.  
**Consequences**:

- ✅ Single source of env truth
- ✅ Security audit trail
- ✅ Reproducible deployments
- ✅ Client-specific configurations  
  **Status**: ✅ Active

## Decision 4: Feature Flag Model

**Date**: 2026-01-30  
**Decision**: Hybrid feature flag model (static JSON + DB-backed) for flexibility.  
**Context**: Need both global feature control and per-client customization.  
**Consequences**:

- ✅ Static flags for environment control
- ✅ DB flags for runtime customization
- ✅ Admin UI for non-technical users
- ✅ Audit trail for compliance  
  **Status**: ✅ Active

## Decision 5: Structured Logging & Error Strategy

**Date**: 2026-01-30  
**Decision**: JSON-structured logging with correlation IDs and tenant context.  
**Context**: Debugging multi-tenant issues was impossible without proper tracing.  
**Consequences**:

- ✅ Request tracing across services
- ✅ Tenant-aware debugging
- ✅ Centralized log aggregation
- ✅ Compliance-ready audit trails  
  **Status**: ✅ Active

## Decision 6: Naming Consistency

**Date**: 2026-01-30  
**Decision**: Standardized terminology across codebase:

- `organization` (not tenant/company)
- `user` (not member)
- `client` (external consuming organization)
- `admin` (internal role, not super-admin unless needed)  
  **Context**: Inconsistent naming caused API confusion and migration pain.  
  **Consequences**:
- ✅ Clear API contracts
- ✅ Consistent UI terminology
- ✅ Reduced client confusion
- ✅ Easier documentation  
  **Status**: ✅ Active

---

## How to Use This Log

1. **Before proposing changes**: Check if decision already exists
2. **When making decisions**: Document here immediately
3. **If challenging decisions**: Present new data, not opinions
4. **Review periodically**: Archive deprecated decisions

## Amendment Process

To amend a decision:

1. Create RFC with: problem, proposal, data, alternatives
2. Get buy-in from: Product Owner, Tech Lead, Security Lead
3. Update this log with: superseded date and new decision
4. Communicate change to all stakeholders

Decision 7: Naming Consistency Standardization
Date: 2026-01-30
Decision: Standardized terminology across codebase:

Primary term: organization (used in database, APIs, business logic)

Legacy support: tenant allowed in technical contexts (guards, isolation layers)

Context: user (not member), client (external organization)
Context: Inconsistent naming caused API confusion, migration pain, and client misunderstandings.
Consequences:

✅ Clear API contracts with consistent terminology

✅ Gradual migration path for existing tenant references

✅ Reduced onboarding confusion

✅ Enterprise-grade terminology alignment
Status: ✅ Active (with legacy support phase)

## Decision 8: Module Extraction Sequence

**Date**: $(date +"%Y-%m-%d")  
**Decision**: Module extraction follows strict sequential order:

1. `auth-core` - Authentication foundation
2. `tenant-core` - Multi-tenant management
3. `branding-engine` - White-label theming
4. `i18n-engine` - Internationalization
5. `crm-basic` - Core CRM functionality
6. `admin-dashboard` - Administration interface

**Context**: Parallel extraction causes integration hell and boundary confusion.
**Consequences**:

- ✅ Clear dependency chain (each builds on previous)
- ✅ Reduced integration complexity
- ✅ Progressive validation of module boundaries
- ✅ Team focus on one boundary at a time
  **Status**: ✅ LOCKED - No parallel extraction without Product Owner approval

## Decision 8: Module Extraction Sequence

**Date**: $(date +"%Y-%m-%d")  
**Decision**: Module extraction follows strict sequential order:

1. `auth-core` - Authentication foundation
2. `tenant-core` - Multi-tenant management
3. `branding-engine` - White-label theming
4. `i18n-engine` - Internationalization
5. `crm-basic` - Core CRM functionality
6. `admin-dashboard` - Administration interface

**Context**: Parallel extraction causes integration hell and boundary confusion.
**Consequences**:

- ✅ Clear dependency chain (each builds on previous)
- ✅ Reduced integration complexity
- ✅ Progressive validation of module boundaries
- ✅ Team focus on one boundary at a time
  **Status**: ✅ LOCKED - No parallel extraction without Product Owner approval
