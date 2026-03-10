# Auth-Core Contract Migration Guide

## Current State vs. Target State

### TokenRepository Contracts

#### Current API Implementation (6 methods):
```typescript
interface TokenRepository {
  createRefreshToken(params: CreateRefreshTokenParams): Promise<RefreshToken>;
  validateRefreshToken(params: ValidateRefreshTokenParams): Promise<boolean>;
  revokeRefreshToken(params: RevokeRefreshTokenParams): Promise<void>;
  revokeAllUserTokens(userId: string, reason?: string): Promise<void>;
  getUserActiveTokens(userId: string): Promise<RefreshToken[]>;
  updateTokenVersion(
    userId: string,
    oldVersion: string,
    newVersion: string,
    newTokenHash: string
  ): Promise<void>;
}
Auth-Core Target (3 methods):
typescript
interface TokenRepository {
  saveRefreshToken(token: RefreshToken): Promise<void>;
  findRefreshToken(tokenId: string): Promise<RefreshToken | null>;
  invalidateRefreshToken(tokenId: string): Promise<void>;
}
UserRepository Contracts
Current API Implementation (6 methods):
typescript
interface UserRepository {
  findByEmail(params: FindUserByEmailParams): Promise<User | null>;
  findById(params: FindUserByIdParams): Promise<User | null>;
  create(params: CreateUserParams): Promise<User>;
  update(params: UpdateUserParams): Promise<User>;
  updateTokenVersion(userId: string, increment?: number): Promise<void>;
  existsByEmail(email: string): Promise<boolean>;
}
Auth-Core Target (6 DIFFERENT methods):
typescript
interface UserRepository {
  updateLoginAttempts(userId: string, attempts: number): Promise<void>;
  lockAccount(userId: string): Promise<void>;
  isAccountLocked(userId: string): Promise<boolean>;
  recordFailedAttempt(userId: string): Promise<void>;
  resetFailedAttempts(userId: string): Promise<void>;
  // Note: find/create/update methods handled differently
}
Critical Business Logic Mapping
Refresh Token Version Binding (Transaction Safety)
Current Pattern:

typescript
// Atomic version check for replay protection
await prisma.user.update({
  where: {
    id: userId,
    refreshTokenVersion: oldVersion, // Critical: version binding
  },
  data: {
    refreshTokenHash: newTokenHash,
    refreshTokenVersion: newVersion,
    tokenVersion: { increment: 1 },
  },
});
Migration Challenge: This transaction-safe pattern must be preserved regardless of which option is chosen.

User Permissions/Roles Loading
Current Pattern: Complex joins through UserRoles → Role → RolePermission → Permission
Auth-Core: No permission/role concepts - focused only on authentication

Migration Strategy Options
Option 1: Keep Current Interfaces in API Layer
Use auth-core for password/JWT services only

Keep existing repositories as-is

Business logic stays in API

Option 2: Split Responsibilities
Auth-core handles: password hashing, JWT signing, token storage basics

API handles: business logic, permissions, roles, complex queries

Create adapter layer to bridge the two

Option 3: Expand Auth-Core
Add missing methods to auth-core

Keep transaction safety patterns

More complex initial package

Immediate Action Items
Safe Changes (All Options):
Update AuthCoreAdapter to use real @helixcrm/auth-core imports

Extract password/JWT services to use auth-core

Keep repository interfaces as-is initially

Risk Assessment:
High Risk: Breaking refresh token transaction safety

Medium Risk: Permission/role loading changes

Low Risk: Password/JWT service migration

Testing Requirements
Must Test:
Refresh token rotation with version binding

Concurrent token operations (race conditions)

Permission loading after user updates

Transaction rollback scenarios

Integration Test Scenarios:
Login → refresh token → logout flow

Multiple devices with same user

Token version invalidation on password change