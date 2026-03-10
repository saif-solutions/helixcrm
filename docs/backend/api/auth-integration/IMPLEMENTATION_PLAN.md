# Option 2 Implementation Plan: Update Adapters First

## Decision Status
✅ **PM Decision:** Option 2 approved - Update adapters to implement real auth-core contracts

## Architecture Overview
We will create a **bridge layer** that:
1. Implements auth-core contracts exactly
2. Maps to existing Prisma database schema
3. Preserves all business logic and transaction safety
4. Maintains API compatibility

## Phase 1: Update PrismaTokenRepository (CRITICAL CLARIFICATIONS)

### Token Identity Clarification (Required Before Coding)
**Problem:** Auth-core assumes a separate `refresh_tokens` table with:
- Unique `id` field for each token
- `findRefreshToken(tokenId)` looks up by this ID

**Current API Schema:** Tokens stored in `user.refreshTokenHash` field
- No separate tokens table
- No token ID concept
- Version-based lookup via `refreshTokenVersion`

**Decision:** We need a **schema adapter pattern**:
- Create a mapping between auth-core's token IDs and our user-based storage
- Use composite key: `userId + refreshTokenVersion` as "tokenId"
- Token IDs are not database PKs, but lookup keys

### Bridge Implementation Strategy:

```typescript
// Pseudo-implementation
class PrismaTokenRepositoryBridge implements TokenRepository {
  async saveRefreshToken(token: RefreshToken): Promise<void> {
    // Map auth-core token to user fields
    // token.id -> composite key: `${userId}:${version}`
    await prisma.user.update({
      where: { id: token.userId },
      data: {
        refreshTokenHash: token.tokenHash,
        refreshTokenVersion: this.extractVersion(token.id),
        refreshTokenIssuedAt: token.createdAt,
      },
    });
  }

  async findRefreshToken(tokenId: string): Promise<RefreshToken | null> {
    // Parse composite key: "userId:version"
    const [userId, version] = this.parseTokenId(tokenId);
    
    const user = await prisma.user.findFirst({
      where: { 
        id: userId,
        refreshTokenVersion: version 
      },
    });

    if (!user || !user.refreshTokenHash) return null;
    
    return this.mapToAuthCoreToken(user, tokenId);
  }

  private parseTokenId(tokenId: string): [string, string] {
    // Format: "userId:version"
    const parts = tokenId.split(':');
    return [parts[0], parts[1]];
  }
}
Critical Business Logic Preservation:
Version binding - Must keep atomic update pattern

Token hashing - Already matches (bcrypt)

Organization context - Implicit via user.organizationId

Model Boundary Rule:
Auth-core User ≠ API User

Auth-core only sees: userId, password hash, lock state, attempt counters

No roles, permissions, or extended user data

Bridge must strip/filter data appropriately

Phase 2: Update PrismaUserRepository
Current Interface (API):
typescript
interface UserRepository {
  findByEmail(params: FindUserByEmailParams): Promise<User | null>;
  findById(params: FindUserByIdParams): Promise<User | null>;
  create(params: CreateUserParams): Promise<User>;
  update(params: UpdateUserParams): Promise<User>;
  updateTokenVersion(userId: string, increment?: number): Promise<void>;
  existsByEmail(email: string): Promise<boolean>;
}
Target Interface (Auth-Core):
typescript
interface UserRepository {
  findById(userId: string): Promise<User | null>;
  updateLoginAttempts(userId: string, attempts: number): Promise<void>;
  lockAccount(userId: string): Promise<void>;
  isAccountLocked(userId: string): Promise<boolean>;
  recordFailedAttempt(userId: string): Promise<void>;
  resetFailedAttempts(userId: string): Promise<void>;
}
Implementation Strategy:
We need a dual interface repository that implements both:

Auth-core interface for auth-core services

Extended interface for API business logic (permissions, user management)

Phase 3: Update AuthCoreAdapter
Current State:
Uses temporary service implementations

Manages transaction safety via withTransaction()

Provides convenience methods for permissions

Target State:
Use real @helixcrm/auth-core package imports

Integrate with real createAuthCore() factory

Preserve transaction safety pattern

Phase 4: Preserve Business Logic Layer
Critical Components to Keep:
RefreshTokenService - Handles refresh token rotation logic

AccountLockoutService - Account security logic

PasswordResetService - Password management

Transaction Safety - withTransaction() pattern

Architecture Pattern:
text
API Business Layer (auth.service.ts)
    ↓
AuthCoreAdapter (Bridge)
    ↓    ↓
Auth-Core Services    Prisma Repositories
    ↓                    ↓
Security Logic          Database
Phase Completion Gates (Discipline Checkpoints)
Phase 1 Complete When:
PrismaTokenRepositoryBridge implements all 3 auth-core methods

Bridge passes unit tests with mocked Prisma

Token ID mapping logic is validated

No changes to existing PrismaTokenRepository

Phase 2 Complete When:
PrismaUserRepositoryBridge implements all 6 auth-core methods

Account lockout logic preserved (failed attempts, lock state)

Bridge passes unit tests

No changes to existing PrismaUserRepository

Phase 3 Complete When:
AuthCoreAdapter uses real @helixcrm/auth-core imports only

withTransaction() method preserved and functional

All temporary service implementations removed

Phase 4 Complete When:
All existing auth endpoints pass regression tests

Login → refresh → logout flow works unchanged

Permission/role loading unchanged

Implementation Steps
Step 1: Install Auth-Core Package
bash
cd apps/api
npm install @helixcrm/auth-core@0.1.0
Step 2: Create Dual-Interface Repositories
Create PrismaTokenRepositoryBridge that implements auth-core TokenRepository

Create PrismaUserRepositoryBridge that implements auth-core UserRepository

Keep existing repositories for API business logic

Step 3: Update AuthCoreAdapter
Replace temporary service implementations with real auth-core imports

Use createAuthCore() factory with bridge repositories

Preserve withTransaction() method

Step 4: Update Auth Service
Ensure all existing methods continue to work

Map between API User model and auth-core User model

Preserve permission/role loading

Risk Mitigation
High Risk Areas:
Refresh token transaction safety - Must preserve version binding

Permission/role loading - Critical for authorization

Backward compatibility - Existing auth flows must work unchanged

Testing Strategy:
Unit tests for all bridge implementations

Integration tests for auth flows (login, refresh, logout)

Transaction tests for concurrent operations

Regression tests for all existing API endpoints

Timeline Estimate
Phase 1 & 2 (Repositories): 4 hours

Phase 3 (Adapter): 2 hours

Phase 4 (Testing & Integration): 2 hours

Total: 8 hours (matches engineering estimate)

Rollback Plan
If integration fails:

Revert to git tag: phase-2-auth-core-integration-complete

Keep auth-core package published (no harm)

Resume with Option 1 approach

Explicit Non-Goals During Adapter Update
Absolutely Out of Scope:
No database schema changes or migrations

No changes to JWT payload structure or claims

No changes to refresh token security model

No performance optimization or refactoring

No changes to auth.service.ts business logic

No addition/removal of auth features

Governance Rule:
Any deviation requires:

Formal decision entry in DECISIONS.md

Separate estimation and scheduling

PM approval