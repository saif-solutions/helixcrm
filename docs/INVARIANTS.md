# HELIXCRM System Invariants (Highest Authority)

> **Constitutional Status:** This document defines fundamental system truths that cannot be violated without invalidating the entire architecture. All other documents defer to these invariants.
>
> **Severity Framework:**
> - **P0 — Catastrophic / Legal / Data Integrity Failure**: Immediate production block, potential data breach or legal impact
> - **P1 — Security / Isolation / Auth Compromise**: Security model violation, authentication/authorization failure
> - **P2 — Architectural Integrity / Drift Risk**: Structural decay, future maintenance burden, scalability impact
> - **P3 — Operational / Performance / Process**: Efficiency, observability, or process degradation

## 1. Tenant Isolation Invariants

### T-01: Cross-Tenant Data Impossibility
**Severity:** P0
**Invariant:** A query executed under tenant A must be structurally incapable of returning tenant B data.
**Enforcement:** PostgreSQL RLS + session-bound tenant variable
**Verification:** Automated tests must prove cross-tenant access is impossible
**Last Verified:** [DATE]

### T-02: Automatic Tenant Context
**Severity:** P1
**Invariant:** No developer decision should be required to enforce tenant scoping.
**Enforcement:** Base repository pattern with mandatory tenant injection
**Verification:** Static analysis detects missing tenant constraints
**Last Verified:** [DATE]

### T-03: Async Boundary Preservation
**Severity:** P1
**Invariant:** Background jobs must execute with the SAME tenant guarantees as HTTP requests.
**Enforcement:** Job context propagation + RLS in worker processes
**Verification:** Integration tests with cross-tenant job attempts
**Last Verified:** [DATE]

### T-04: Tenant-Scoped Uniqueness
**Severity:** P2
**Invariant:** No uniqueness constraint may span tenants.
**Enforcement:** Composite unique constraints include organizationId
**Verification:** Schema validation + duplicate insert tests
**Last Verified:** [DATE]

## 2. Security Invariants

### S-01: Authentication Determinism
**Severity:** P1
**Invariant:** Token revocation must be immediate and deterministic.
**Enforcement:** Token versioning + atomic refresh rotation
**Verification:** Concurrent refresh tests + revocation validation
**Last Verified:** [DATE]

### S-02: Secret Safety
**Severity:** P0
**Invariant:** Missing secrets MUST crash startup - no fallbacks, no defaults.
**Enforcement:** Runtime validation before any service initialization
**Verification:** Startup tests with missing environment variables
**Last Verified:** [DATE]

### S-03: Audit Completeness
**Severity:** P1
**Invariant:** Every security-relevant action must be audited, including denials.
**Enforcement:** Mandatory audit interceptor + failure logging
**Verification:** Test coverage for all auth paths + negative cases
**Last Verified:** [DATE]

## 3. Architectural Invariants

### A-01: Domain Purity
**Severity:** P2
**Invariant:** Domain layer must be framework-independent.
**Enforcement:** AST-based import rules in CI
**Verification:** Static analysis blocks framework imports in domain
**Last Verified:** [DATE]

### A-02: Module Isolation
**Severity:** P2
**Invariant:** Modules communicate only through defined contracts.
**Enforcement:** Dependency graph validation in CI
**Verification:** Cross-module import detection
**Last Verified:** [DATE]

### A-03: Contract Authority
**Severity:** P2
**Invariant:** Code contracts are authoritative; documentation explains.
**Enforcement:** Contract tests must pass before deployment
**Verification:** Consumer-driven contract testing
**Last Verified:** [DATE]

### A-04: Archive Immutability
**Severity:** P3
**Invariant:** Files inside `docs/_archive` are immutable historical artifacts.
**Rules:**
- MUST NOT be edited
- MUST NOT be referenced as authority
- Corrections require new documents, never mutation
**Last Verified:** [DATE]

## 4. Operational Invariants

### O-01: Configuration Completeness
**Severity:** P1
**Invariant:** All required configuration must be validated at startup.
**Enforcement:** Runtime validation + explicit error messages
**Verification:** Startup tests with partial configuration
**Last Verified:** [DATE]

### O-02: Configuration Exclusivity
**Severity:** P3
**Invariant:** Unknown configuration variables must be detected and rejected.
**Enforcement:** Runtime validation warns on unknown HELIX_* variables
**Verification:** Startup tests with extraneous variables
**Last Verified:** [DATE]

### O-03: Traceability
**Severity:** P2
**Invariant:** Every request must be traceable across services.
**Enforcement:** Correlation ID propagation + structured logging
**Verification:** End-to-end trace validation tests
**Last Verified:** [DATE]

### O-04: Build Reproducibility
**Severity:** P3
**Invariant:** Same commit → identical artifact.
**Enforcement:** Lockfiles + deterministic build process
**Verification:** Build hash comparison across environments
**Last Verified:** [DATE]

## 5. Governance Invariants

### G-01: No Silent Relaxation
**Severity:** P2
**Invariant:** Enforcement strength may only increase, never decrease without formal decision.
**Enforcement:** Decision log required for any relaxation
**Verification:** Audit trail of invariant modifications
**Last Verified:** [DATE]

### G-02: Archive Immutability
**Severity:** P3
**Invariant:** Files inside `docs/_archive` are immutable historical artifacts.
**Enforcement Rules:**
- MUST NOT be edited after archival (content freeze)
- MUST NOT be referenced as active authority
- MUST maintain original creation timestamps
- Corrections require new documents with cross-reference, never mutation
**Verification:** 
- Automated hash comparison for archived files
- Periodic integrity scans
**Last Verified:** [DATE]

### G-03: Archive Structure Integrity
**Severity:** P3
**Invariant:** Archive must maintain time-structured organization.
**Enforcement:** 
- Format: `docs/_archive/history/YYYY/MM/`
- No files directly in `docs/_archive` root
- Metadata preserved with each archived file
**Last Verified:** [DATE]

---

**Amendment Process:** Changes to invariants require:
1. RFC with impact analysis
2. Security review for P0/P1 changes
3. Architecture board approval
4. Migration plan for existing violations

**Last Updated:** 2026-02-14