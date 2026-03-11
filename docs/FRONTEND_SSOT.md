HelixCRM Frontend Production Readiness: SSOT & Execution Blueprint
Authority Level: Level 1B (Controlled Authority)
Status: Approved for Execution
Last Updated: 2026-03-01
Owner: Frontend Architecture Team

PART 1: ARCHITECTURAL FOUNDATIONS
1.1 Frontend Security Boundary Policy
typescript
// docs/frontend-security-boundary.md (to be created)
/\*\*

- FRONTEND SECURITY BOUNDARY POLICY
-
- ABSOLUTE RULES:
- 1.  Frontend is a VISIBILITY LAYER ONLY
- 2.  All enforcement happens in backend
- 3.  Never trust frontend permission decisions
- 4.  Never store security-sensitive data in localStorage
- 5.  Never decode JWT for authorization decisions
-
- LAYER RESPONSIBILITIES:
-
- Backend (Enforcement Layer):
- - Authentication verification
- - Permission checks
- - Tenant isolation (RLS)
- - CSRF validation
- - Rate limiting
-
- Frontend (UX Layer):
- - Hide inaccessible actions
- - Show loading states
- - Display errors
- - Optimistic updates (with rollback)
-
- FORBIDDEN PATTERNS:
- ❌ "if (user.role === 'admin') showButton" - Use permission checks
- ❌ "localStorage.setItem('token', jwt)" - Use httpOnly cookies
- ❌ "jwtDecode(token).permissions" - Trust backend response only
- ❌ Client-side route guards as only protection
  \*/
  1.2 API Contract Stability Protocol
  yaml

# .github/workflows/api-contract-validation.yml

name: API Contract Validation
on:
pull_request:
paths: - 'apps/api/**' - 'packages/auth-core/**'

jobs:
validate-contract:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v3

      - name: Generate OpenAPI Snapshot
        run: |
          cd apps/api
          npm run generate-openapi
          cp openapi-snapshot.json ../../openapi-snapshot.json

      - name: Compare with Baseline
        run: |
          if ! diff -q openapi-snapshot.json docs/api/openapi-baseline.json; then
            echo "❌ API Contract Changed Without Version Bump"
            echo "Run: npm run validate-breaking-changes"
            exit 1
          fi

1.3 Type Generation Pipeline
json
// apps/web/package.json
{
"scripts": {
"generate-types": "npm run generate:api && npm run generate:zod",
"generate:api": "openapi-typescript http://localhost:3001/api/v1/openapi -o src/lib/types/generated/api.ts",
"generate:zod": "ts-to-zod src/lib/types/generated/api.ts src/lib/types/generated/api.zod.ts",
"prebuild": "npm run generate-types",
"validate:contract": "ts-node scripts/validate-contract.ts"
}
}
PART 2: EXECUTION CHECKLIST (SSOT)
This is THE source of truth for all frontend work
Every session, update status and date

STAGE A: INTEGRITY FOUNDATION 🔴 HIGHEST PRIORITY
ID Task Status Owner Due Verified
A-01 OpenAPI Baseline ⬜
A-01.1 Verify /api/v1/openapi endpoint exists ⬜
A-01.2 Generate and commit openapi-baseline.json ⬜
A-01.3 Add CI contract validation workflow ⬜
A-01.4 Create breaking change detection script ⬜
A-01 DONE CHECK: CI fails if API changes without version bump ⬜
ID Task Status Owner Due Verified
A-02 Type-Safe API Client ⬜
A-02.1 Generate TypeScript types from OpenAPI ⬜
A-02.2 Generate Zod schemas for runtime validation ⬜
A-02.3 Remove all manual \*.types.ts files ⬜
A-02.4 Create type-safe fetch wrapper ⬜
A-02.5 Add response validation with Zod ⬜
A-02 DONE CHECK: No any types in API calls ⬜
ID Task Status Owner Due Verified
A-03 Tenant Context Hardening ⬜
A-03.1 Create TenantContext singleton with fail-fast ⬜
A-03.2 Add request interceptor that throws if tenant missing ⬜
A-03.3 Implement query cache purge on tenant switch ⬜
A-03.4 Add tenant ID to all structured logs ⬜
A-03.5 Create test that verifies no request without tenant ⬜
A-03 DONE CHECK: Impossible to send request without tenant ⬜
ID Task Status Owner Due Verified
A-04 Error Handling Standardization ⬜
A-04.1 Map all backend error codes to user messages ⬜
A-04.2 Add correlation ID to all error displays ⬜
A-04.3 Create error logging service ⬜
A-04.4 Implement retry logic for transient errors ⬜
A-04.5 Add error boundary with recovery options ⬜
A-04 DONE CHECK: All API errors show correlation ID ⬜
ID Task Status Owner Due Verified
A-05 Performance Baseline ⬜
A-05.1 Measure current FCP, LCP, TTI ⬜
A-05.2 Record baseline in performance-baseline.json ⬜
A-05.3 Set up Lighthouse CI ⬜
A-05.4 Create performance budget config ⬜
A-05 DONE CHECK: Baseline recorded, CI configured ⬜
STAGE B: SECURITY PARITY 🟡 MUST COMPLETE BEFORE FEATURES
ID Task Status Owner Due Verified
B-01 Permission System ⬜
B-01.1 Create usePermission hook with wildcard support ⬜
B-01.2 Implement <RequirePermission> component ⬜
B-01.3 Add permission-based menu filtering ⬜
B-01.4 Create permission cache with invalidation ⬜
B-01.5 Add permission debug tool (dev only) ⬜
B-01 DONE CHECK: UI matches backend permissions ⬜
ID Task Status Owner Due Verified
B-02 CSRF Protection ⬜
B-02.1 Fetch CSRF token on app init ⬜
B-02.2 Add CSRF token to all mutation requests ⬜
B-02.3 Handle CSRF token expiration/refresh ⬜
B-02.4 Test all mutation endpoints ⬜
B-02 DONE CHECK: All POST/PUT/PATCH/DELETE have CSRF ⬜
ID Task Status Owner Due Verified
B-03 Authentication Flow ⬜
B-03.1 Implement token refresh mechanism ⬜
B-03.2 Add session timeout warning ⬜
B-03.3 Handle 401 with silent refresh ⬜
B-03.4 Clear all caches on logout ⬜
B-03.5 Add login rate limit UX ⬜
B-03 DONE CHECK: Session survives token refresh ⬜
ID Task Status Owner Due Verified
B-04 Security Test Suite ⬜
B-04.1 Tenant isolation tests ⬜
B-04.2 Permission enforcement tests ⬜
B-04.3 CSRF validation tests ⬜
B-04.4 XSS prevention tests ⬜
B-04.5 No token in storage tests ⬜
B-04 DONE CHECK: All security tests passing in CI ⬜
STAGE C: OBSERVABILITY 🟢 PARALLEL WITH FEATURES
ID Task Status Owner Due Verified
C-01 Structured Logging ⬜
C-01.1 Create logger with levels (debug/info/warn/error) ⬜
C-01.2 Add correlation ID propagation ⬜
C-01.3 Enrich logs with tenant/user context ⬜
C-01.4 Implement log batching for performance ⬜
C-01.5 Send errors to backend endpoint ⬜
C-01 DONE CHECK: All errors logged with context ⬜
ID Task Status Owner Due Verified
C-02 Performance Monitoring ⬜
C-02.1 Track Core Web Vitals ⬜
C-02.2 Monitor API latency by endpoint ⬜
C-02.3 Track component render times (dev) ⬜
C-02.4 Set up alerts for SLO violations ⬜
C-02 DONE CHECK: Performance dashboards populated ⬜
ID Task Status Owner Due Verified
C-03 Analytics Integration ⬜
C-03.1 Track user actions (non-PII) ⬜
C-03.2 Monitor feature usage ⬜
C-03.3 Track error rates by page ⬜
C-03.4 Create usage dashboard ⬜
C-03 DONE CHECK: Product analytics available ⬜
STAGE D: CORE FEATURES (HARDENED) 🔵 AFTER STAGES A-B
For each feature, ALL must be verified:

Feature Loading State Empty State Error State Permission State Tenant Isolation Status
D-01 Authentication ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-01.1 Login ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-01.2 Registration ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-01.3 Password Reset ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-01.4 Profile Management ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-02 Dashboard ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-02.1 Stats widgets ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-02.2 Charts ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-02.3 Recent activity ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-03 Contacts ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-03.1 List with pagination ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-03.2 Search/filter ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-03.3 Create/Edit ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-03.4 Detail view ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-03.5 Import/Export ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-04 Leads ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-04.1 Kanban view ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-04.2 List view ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-04.3 Drag-drop with rollback ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-04.4 Create/Edit ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-04.5 Convert to deal ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-05 Deals ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-05.1 Pipeline view ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-05.2 Stage management ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-05.3 Create/Edit ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-05.4 Deal detail ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-06 Audit Logs ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-06.1 Filterable table ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-06.2 Date range filter ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-06.3 Export functionality ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-07 User Management ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-07.1 User list ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-07.2 Create/Edit ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-07.3 Role assignment ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
D-07.4 Invitation system ⬜ ⬜ ⬜ ⬜ ⬜ ⬜
STAGE E: RELEASE HARDENING 🟣 FINAL GATES
ID Task Status Owner Verified
E-01 CI/CD Gates ⬜
E-01.1 Type check passes ⬜
E-01.2 Lint passes ⬜
E-01.3 Unit tests >80% coverage ⬜
E-01.4 Integration tests pass ⬜
E-01.5 E2E critical paths pass ⬜
E-01.6 Bundle size within budget ⬜
E-01.7 Lighthouse scores >90 ⬜
E-01.8 Storybook builds ⬜
ID Task Status Owner Verified
E-02 Security Validation ⬜
E-02.1 No sensitive data in localStorage ⬜
E-02.2 CSP headers configured ⬜
E-02.3 XSS audit passed ⬜
E-02.4 Security test suite passing ⬜
E-02.5 Penetration test (if applicable) ⬜
ID Task Status Owner Verified
E-03 Multi-Tenant Validation ⬜
E-03.1 Tenant A sees only their data ⬜
E-03.2 Tenant B sees only their data ⬜
E-03.3 Cache cleared on tenant switch ⬜
E-03.4 Cross-tenant attempts blocked ⬜
ID Task Status Owner Verified
E-04 Production Configuration ⬜
E-04.1 Environment variables validated ⬜
E-04.2 Feature flags configured ⬜
E-04.3 Error tracking (Sentry) configured ⬜
E-04.4 Analytics configured ⬜
E-04.5 CDN/static hosting configured ⬜
PART 3: PRODUCTION GO-LIVE CHECKLIST
This document must be signed off by: Tech Lead, Security Lead, Product Owner

markdown

# PRODUCTION GO-LIVE VERIFICATION

Date: ******\_\_\_******
Version: ******\_\_\_******

## STAGE A VERIFICATION

[ ] A-01: API contract frozen and CI enforced
[ ] A-02: Type-safe client with zero manual types
[ ] A-03: Tenant context fail-fast verified
[ ] A-04: All errors show correlation IDs
[ ] A-05: Performance baseline recorded

## STAGE B VERIFICATION

[ ] B-01: Permission system matches backend
[ ] B-02: CSRF on all mutations
[ ] B-03: Token refresh working
[ ] B-04: Security tests passing

## STAGE C VERIFICATION

[ ] C-01: Structured logging implemented
[ ] C-02: Performance monitoring active
[ ] C-03: Analytics tracking configured

## STAGE D VERIFICATION

[ ] D-01: Authentication flow complete
[ ] D-02: Dashboard functional
[ ] D-03: Contacts complete
[ ] D-04: Leads complete
[ ] D-05: Deals complete
[ ] D-06: Audit logs complete
[ ] D-07: User management complete

## STAGE E VERIFICATION

[ ] E-01: All CI gates passing
[ ] E-02: Security validation passed
[ ] E-03: Multi-tenant isolation verified
[ ] E-04: Production config validated

## FINAL APPROVALS

Tech Lead: ********\_******** Date: ****\_****
Security Lead: ********\_******** Date: ****\_****
Product Owner: ********\_******** Date: ****\_****

## ROLLBACK PLAN

[ ] Rollback procedure documented
[ ] Database rollback tested
[ ] Frontend version rollback tested
[ ] Communication plan ready
PART 4: SESSION TRACKING
Current Session: [DATE]
Focus: [STAGE/TASK]
Completed Items:

Item 1

Item 2

## Blockers/Issues:

Next Session:

Item 1

Item 2

Progress Dashboard
Stage Total Tasks Completed Progress
A: Integrity Foundation 25 0 0%
B: Security Parity 20 0 0%
C: Observability 12 0 0%
D: Core Features 45 0 0%
E: Release Hardening 20 0 0%
TOTAL 122 0 0%
PART 5: IMPLEMENTATION GUIDE
How to Use This Document
Start each day by reviewing the checklist

Complete tasks in order (Stage A → B → C → D → E)

Mark tasks as done only when verified

Update progress dashboard after each session

Log blockers immediately for resolution

Never skip stages - each builds on previous

Definition of "DONE" for a Task
✅ Code written and committed

✅ Tests passing

✅ Documentation updated

✅ Verified in staging

✅ No security violations

✅ Performance impact measured

Emergency Procedures
If a security violation is found:

Stop all feature work

Create violation record (see INVARIANT_VIOLATIONS.md)

Fix immediately

Document root cause

Update tests to prevent recurrence

PART 6: ANSWERS TO YOUR QUESTIONS
OpenAPI Status
Is OpenAPI spec already exposed at /api/v1/openapi?

We need to verify. Please check:

bash
curl http://localhost:3001/api/v1/openapi
If not available, we'll need to add Swagger module to NestJS.

Validation Strategy
Runtime (Zod) or compile-time only?

Recommendation: Both

Compile-time: TypeScript types for developer experience

Runtime: Zod for API response validation (catch backend contract violations)

Launch Scope
Public SaaS or controlled beta?

This determines:

Load testing requirements

Monitoring depth

Rollback procedures

Recommendation: Assume public SaaS, prepare for scale

🚀 NEXT ACTION
Please confirm:

OpenAPI endpoint status - run the curl command above

Launch scope - public or beta?

Team size - solo or multiple engineers?

Target timeline - when is go-live?

Once confirmed, I'll begin implementing A-01: OpenAPI Baseline and provide daily updates against this checklist.
