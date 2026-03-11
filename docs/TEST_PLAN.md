# Helix CRM - Test Implementation Plan

## Ì≥ä Current Status (as of 2026-03-11)

| Test Type | Location | Count | Target | Status |
|-----------|----------|-------|--------|--------|
| Unit Tests | `tests/unit/api/` | 51 | 150+ | Ìø° In Progress |
| Integration Tests | `tests/integration/` | 0 | 50+ | Ì¥¥ Not Started |
| Security Tests | `tests/security/` | 7 | 25+ | Ìø° In Progress |
| Contract Tests | `tests/contracts/` | 2 | 15+ | Ìø° In Progress |
| E2E Tests | `tests/e2e/` | 1 | 12-15 | Ì¥¥ Not Started |
| Frontend Tests | `tests/unit/web/` | 0 | 100+ | Ì¥¥ Not Started |

## ÌæØ Priority Testing Targets (Next 2 Weeks)

### Week 1: Critical Path
- [ ] Complete auth module tests (15 tests)
- [ ] Complete deals module tests (12 tests)
- [ ] Complete leads module tests (10 tests)
- [ ] Add 5 critical security invariants

### Week 2: Core Coverage
- [ ] Add integration tests for auth+audit
- [ ] Add pipeline stage transition tests
- [ ] Complete RBAC permission tests
- [ ] Add first 3 E2E flows

## Ì∫¶ How to Run Tests

```bash
# Quick test during development
npm run test:watch

# Full test suite before commit
npm test

# Coverage report
npm run test:cov

# CI mode (for GitHub Actions)
npm run test:ci
Ì≥ù Test Writing Guidelines
One assertion per test when possible

Use factories from tests/helpers/factories/

Mock external services (never call real APIs)

Tag critical tests with @critical

Keep tests fast (<100ms for unit, <1s for integration)

Ì∫´ Don't Touch Configuration
The test infrastructure is now locked. Do not modify:

jest.config.js

tsconfig.json

tests/helpers/ utilities

package.json test scripts

All effort goes into writing tests.

‚úÖ Definition of Done for New Features
A feature is complete when:

Unit tests cover all new logic

Integration tests verify cross-module interaction

Security invariants still pass

All tests pass locally

Coverage maintained or improved
