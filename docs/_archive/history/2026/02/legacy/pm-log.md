# HELIX CRM -- Project Manager Working Document (Internal)

**Owner:** Saif\
**PM (AI):** ChatGPT\
**Project:** Helix Enterprise Platform / HelixCRM

------------------------------------------------------------------------

## 1. Project Overview

HelixCRM is a monorepo-based enterprise platform with:

-   Frontend: React/Next.js (apps/web)
-   Backend API: Node.js/TypeScript (apps/api)
-   Shared packages: packages/\*
-   Infra: Docker, scripts, env config
-   Governance layer: Phase 0 documentation

Current repo status emphasizes governance and enterprise process more
than product completeness.

------------------------------------------------------------------------

## 2. Current Technical State (from ZIP #1)

### Architecture

-   Monorepo with TurboRepo
-   apps/api -- REST API (auth, users, orgs, roles, permissions, CSRF
    work)
-   apps/web -- UI shell, auth screens, dashboard skeleton
-   packages -- shared types, config, auth utilities

### Implemented

-   Project scaffolding
-   Environment configuration
-   Auth framework (JWT/session + CSRF handling)
-   User & organization models (partial)
-   Role/permission groundwork
-   API routing structure
-   Web app layout + routing
-   Governance & documentation (Phase 0 complete)

### Missing / Incomplete

-   Leads
-   Contacts
-   Accounts
-   Deals
-   Activities / tasks
-   Reporting
-   UI modules
-   Workflows
-   Tests
-   Deployment pipeline

------------------------------------------------------------------------

## 3. MVP Definition

### Backend

-   Authentication
-   Organization + user management
-   CRUD: Leads, Contacts, Deals
-   Simple pipeline stages

### Frontend

-   Login page
-   Dashboard
-   Leads list + create/edit
-   Contacts list + create/edit
-   Deals list view

------------------------------------------------------------------------

## 4. Project Completion Estimate

  Area                  Completion
  --------------------- ------------
  Governance & Docs     100%
  Backend foundation    60%
  Frontend foundation   40%
  CRM business logic    10%
  MVP readiness         25%

------------------------------------------------------------------------

## 5. Strategy

Proceed with MVP first.

Build → Pilot → Learn → Harden → Scale

------------------------------------------------------------------------

## 6. Execution Plan (4 Weeks)

### Week 1 -- Backend MVP

-   DB schema
-   Leads API
-   Contacts API
-   Deals API

### Week 2 -- Frontend MVP

-   UI modules
-   Dashboard
-   Integration

### Week 3 -- Stabilization

-   Bug fixes
-   Auth hardening
-   Roles

### Week 4 -- Pilot

-   Deploy
-   Sample users
-   Onboarding

------------------------------------------------------------------------

## 7. Operating Model

For every new ZIP:

1.  Diff versions
2.  Update progress
3.  Identify blockers
4.  Update this document
5.  Provide next sprint plan

------------------------------------------------------------------------

## 8. Progress Log

### ZIP #1 -- 2026-01-19

-   Governance complete
-   API & Web skeleton
-   Auth infrastructure
-   No CRM modules

------------------------------------------------------------------------

## 9. Risks

  Risk               Impact   Mitigation
  ------------------ -------- -------------------
  Over-engineering   High     Freeze governance
  Scope creep        High     Lock MVP
  Solo overload      High     Weekly goals

------------------------------------------------------------------------

## 10. Immediate Next Actions

1.  Lock MVP features
2.  Implement schema
3.  Build Leads API
4.  Pause enterprise hardening

------------------------------------------------------------------------

*Maintained by ChatGPT acting as Project Manager.*
