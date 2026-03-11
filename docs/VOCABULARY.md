# HELIXCRM Canonical Vocabulary

> **Authority Level:** Constitutional (Level 1A)
> **Purpose:** Define precise, unambiguous terminology used across all documentation, code, and communication.
> **Rule:** These terms MUST NOT be redefined elsewhere. All documentation MUST use these definitions.

## Core Domain Terms

### Organization

**Definition:** A customer entity that represents a distinct tenant in the system. Each organization has isolated data, users, and configuration.
**Synonyms (avoid):** tenant, company, account, workspace
**Context:**

- Database: `organizations` table
- API: `/api/v1/organizations`
- Code: `Organization` entity
- RLS: `organization_id` foreign key

### User

**Definition:** An individual who can authenticate and access the system within an organization context.
**Synonyms (avoid):** member, person, account holder
**Context:**

- Must belong to exactly one organization
- Can have multiple roles within organization
- Authentication bound to organization context

### Tenant (Legacy/Technical Context Only)

**Definition:** Technical term for isolation boundary, used in infrastructure and security contexts. In business logic, use "Organization".
**Usage Rules:**

- ✅ Allowed in: RLS policies, database comments, infrastructure code
- ❌ Avoid in: API responses, UI, business documentation
- Migration: All new code should prefer "organization"

### Account

**Definition:** A financial/customer account for billing and subscription purposes. Not to be confused with Organization.
**Note:** Currently out of MVP scope. When implemented, will be separate from Organization entity.

## Authentication & Security

### Access Token

**Definition:** Short-lived JWT (15-30 minutes) used to authorize API requests.
**Contains:** `userId`, `organizationId`, `roles`, `permissions`, `tokenVersion`
**Transport:** HTTP-only cookie or Authorization header

### Refresh Token

**Definition:** Long-lived token used to obtain new access tokens. Implements rotation for security.
**Storage:** Hashed in database, never exposed to client after issuance
**Lifecycle:** Single-use, rotated on each refresh

### Session

**Definition:** The period of authenticated interaction between a user and the system, represented by a valid refresh token.
**Not to be confused with:** HTTP session, which is not used in this stateless architecture

### Token Version

**Definition:** Monotonically increasing integer used to invalidate all previous tokens for a user (e.g., on password change).
**Enforcement:** Checked during token validation against user record

## Authorization

### Role

**Definition:** Named collection of permissions (e.g., "Admin", "Manager", "Sales Rep").
**Scope:** Organization-specific (roles in different organizations are distinct)

### Permission

**Definition:** Atomic capability to perform an action, formatted as `module.action` (e.g., `contacts.create`).
**Assignment:** Through roles only (not directly to users)

### RBAC (Role-Based Access Control)

**Definition:** Authorization model where permissions are assigned to roles, and roles are assigned to users.

## Architecture

### Module

**Definition:** A independently versionable package with clear boundaries and contracts.
**Location:** `/packages/*`
**Characteristics:**

- Owns its data schema
- Exports contracts for interaction
- Cannot depend on other modules' internals

### Contract

**Definition:** Explicit interface defining module boundaries, including TypeScript types and behavior specifications.
**Location:** `/packages/*/src/contracts/`
**Verification:** Executable contract tests ensure compliance

### Invariant

**Definition:** A rule that must always be true for the system to be considered valid. Documented in `INVARIANTS.md`.
**Severity:** P0 (Catastrophic) to P3 (Operational)

### Adapter

**Definition:** Layer that translates between module boundaries, allowing modules to interact without direct coupling.
**Example:** `AuthCoreAdapter` translates between auth-core contracts and API expectations

## Data

### RLS (Row-Level Security)

**Definition:** PostgreSQL feature that restricts which rows a query can return based on the current user/organization context.
**Enforcement:** Database-level, non-bypassable for application queries

### Soft Delete

**Definition:** Marking records as deleted without physical removal, using `deletedAt` timestamp.
**Rule:** Must respect tenant isolation even for deleted records

## Operational

### Correlation ID

**Definition:** Unique identifier propagated across all services for a single request, enabling request tracing.
**Header:** `X-Request-ID`
**Logging:** Included in all log entries

### Audit Log

**Definition:** Immutable record of security-relevant events, including successes, failures, and denials.
**Storage:** Append-only, cannot be modified or deleted

### Feature Flag

**Definition:** Mechanism to enable/disable functionality without deployment.
**Types:**

- Static: Environment-based configuration
- Dynamic: Database-backed, per-organization toggles

## Document Types

### Constitutional Document (Level 1A)

**Definition:** Document defining fundamental system truths that change rarely and require formal ceremony.
**Examples:** `INVARIANTS.md`, `ARCHITECTURE_PRINCIPLES.md`

### Controlled Document (Level 1B)

**Definition:** Authoritative document that evolves through normal engineering workflow.
**Examples:** `API_CONTRACTS.md`, `OPERATIONS.md`

### Historical Document (Level 3)

**Definition:** Immutable record of past states, stored in `/_archive/`. Never referenced as authority.

## Change Control

### Decision Record

**Definition:** Formal documentation of architectural decisions in `DECISIONS.md`.
**Format:** Date, Decision, Context, Consequences, Status

### RFC (Request for Comments)

**Definition:** Proposal for significant changes requiring review before decision.
**Required for:** Changes to constitutional documents, new invariants

---

## Usage Guidelines

1. **Consistency:** Always use these terms as defined
2. **Reviews:** Terminology drift is a review failure
3. **Updates:** Changes to this document require constitutional process
4. **Translation:** When mapping to external terms (client requirements), explicitly document the mapping

## Version History

| Version | Date       | Changes                      |
| ------- | ---------- | ---------------------------- |
| 1.0     | 2026-02-14 | Initial canonical vocabulary |

**Last Verified:** 2026-02-14
