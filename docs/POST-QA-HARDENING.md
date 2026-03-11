# Phase 4 – Post‑QA Hardening & Architecture To‑Do (Authoritative)

> **Purpose**
> This document is the _single source of truth_ for post‑QA architectural hardening work.
> It is intentionally **not** part of Phase 3B QA.
> Any future session, engineer, or AI assistant should use this document to:
>
> - Check **what has already been completed**
> - Know **what must NOT be changed yet**
> - Know **exactly what to do next** when Phase 4 begins

---

## 🔒 PHASE 3B STATUS (LOCKED – DO NOT MODIFY)

**State:** ✅ Architecture validated, QA nearly complete
**Rule:** ❌ No refactors below this line until QA exit criteria are met

### ✅ CONFIRMED WORKING (DO NOT TOUCH)

- Auth login flow (HTTP 200)
- Access & refresh token issuance
- JWT secret loading & validation
- CSRF protection (cookie + header)
- Audit logging (3‑lane architecture)
- AuthCoreAdapter + canonical contract
- TypeScript: **0 errors**

### 🔴 ALLOWED CHANGES (QA ONLY)

- Bug fixes with **zero architectural impact**
- Repository call corrections (parameter mismatch, etc.)
- Test‑only adjustments

### ❌ FORBIDDEN UNTIL PHASE 4

- Repository unification
- Interface reshaping beyond bug fixes
- Transaction boundary refactors
- Domain model rewrites

---

## 🚀 PHASE 4 GOAL (WHY THIS EXISTS)

**Objective:**

> Reduce long‑term architectural risk **without changing behavior**.

Phase 4 is about:

- Maintainability
- Contract clarity
- Repository correctness
- Future scalability

**Phase 4 is NOT about:**

- Adding features
- Changing auth behavior
- Performance tuning (unless regression found)

---

## 🧱 IDENTIFIED ARCHITECTURAL DEBT (CONFIRMED)

### 1️⃣ Dual Repository Pattern (KNOWN ISSUE)

**Current State:**

- PrismaUserRepository (business/full)
- PrismaUserRepositoryBridge (auth‑core/minimal)

**Problems:**

- Method signature drift
- Confusing responsibilities
- Easy to misuse (as seen in refresh token bug)

**Status:** ❌ Not fixed (by design)

---

### 2️⃣ Contract Boundary Ambiguity

**Current State:**

- auth‑core expects minimal contracts
- business logic needs richer models
- Boundaries are implicit, not enforced

**Risk:**

- Accidental contract misuse
- Hidden coupling

**Status:** ❌ Deferred

---

### 3️⃣ Transaction Scope Inconsistency

**Current State:**

- Mixed use of global PrismaService
- Transaction‑scoped repositories passed ad‑hoc

**Risk:**

- Hard‑to‑debug partial commits
- Future race conditions

**Status:** ❌ Deferred

---

## 🟦 PHASE 4A – SAFE FOUNDATION (LOW RISK)

> **Must be done first. No behavior change allowed.**

### ✅ TASKS

#### 4A‑1: Introduce Unified Repository Contracts

**File:** `shared/contracts/repositories.contract.ts`

```ts
export interface IUserRepository {
  // Auth‑core compatibility
  findById(userId: string): Promise<AuthCoreUser | null>;

  // Business needs
  findFullUserById(userId: string): Promise<BusinessUser | null>;
  updateTokenVersion(userId: string, increment: number): Promise<void>;
}

export interface ITokenRepository {
  saveRefreshToken(token: RefreshToken): Promise<void>;
  updateTokenVersion(
    userId: string,
    oldVersion: string,
    newVersion: string,
    newTokenHash: string,
  ): Promise<void>;
}
```

**Rules:**

- ❌ No Prisma changes
- ❌ No logic changes
- ✅ Interfaces only

---

#### 4A‑2: Adapt Existing Repositories (NO REWRITE)

- PrismaUserRepository implements `IUserRepository`
- PrismaUserRepositoryBridge implements **subset only**
- Explicitly document unsupported methods

**Acceptance Criteria:**

- TypeScript enforces correct usage
- No runtime behavior change

---

## 🟨 PHASE 4B – UNIFIED IMPLEMENTATION (MEDIUM RISK)

> **Only start after Phase 4A is stable and tested.**

### 🎯 OBJECTIVE

Replace dual repositories with **single, explicit implementations**.

---

### 4B‑1: Unified Repository Implementations

**Files:**

- `UnifiedUserRepository`
- `UnifiedTokenRepository`

**Rules:**

- One repository per aggregate
- One Prisma client per instance
- Clear separation of auth‑core vs business methods

---

### 4B‑2: Transaction Boundary Enforcement

**Change:**

- AuthCoreAdapter becomes the **only** transaction orchestrator

```ts
withTransaction(async ({ userRepository, tokenRepository }) => {
  // all auth flows live here
});
```

**Rules:**

- ❌ No `$transaction` calls outside adapter
- ✅ Repositories always transaction‑scoped when required

---

## 🧪 PHASE 4C – VALIDATION & SAFETY NETS

### REQUIRED TESTS

- Refresh token replay protection
- Concurrent refresh attempts
- Logout invalidation
- Account lockout

### NON‑NEGOTIABLE

- 0 TypeScript errors
- No auth behavior changes
- Performance regression < 5%

---

## 🚨 EXPLICIT NON‑GOALS (DO NOT DO)

- ❌ Do not change token structure
- ❌ Do not change JWT claims
- ❌ Do not modify audit semantics
- ❌ Do not alter CSRF behavior
- ❌ Do not refactor unrelated modules

---

## 📌 COMPLETION CHECKLIST

Phase 4 is considered complete only if:

- [ ] Phase 3B fully closed
- [ ] Phase 4A merged with no behavior changes
- [ ] Phase 4B merged behind feature flag or controlled rollout
- [ ] Full auth regression suite passes
- [ ] PM + Security sign‑off recorded

---

## 🧠 GUIDANCE FOR FUTURE SESSIONS (IMPORTANT)

If this document is present:

1. **Check Phase 3B status first**
2. If QA not complete → **STOP**
3. If QA complete → start Phase 4A only
4. Never jump directly to Phase 4B

---

## 📅 OWNERSHIP & CHANGE CONTROL

- Owner: Engineering / Architecture
- Changes require: PM approval
- This document supersedes ad‑hoc refactor plans

---

**Last Updated:** 2024‑01‑31
**Status:** ACTIVE – DEFERRED UNTIL POST‑QA
