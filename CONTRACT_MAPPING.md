# Contract Mapping: Temporary Interfaces → Auth-Core Contracts

## TokenRepository Mapping

### Temporary Interface (Current):
```typescript
interface TokenRepository {
  createRefreshToken(params: CreateRefreshTokenParams): Promise<RefreshToken>;
  validateRefreshToken(params: ValidateRefreshTokenParams): Promise<boolean>;
  revokeRefreshToken(params: RevokeRefreshTokenParams): Promise<void>;
  revokeAllUserTokens(userId: string, reason?: string): Promise<void>;
  getUserActiveTokens(userId: string): Promise<RefreshToken[]>;
  updateTokenVersion(userId: string, oldVersion: string, 
                     newVersion: string, newTokenHash: string): Promise<void>;
}
Auth-Core Contract (Target):
typescript
interface TokenRepository {
  saveRefreshToken(token: RefreshToken): Promise<void>;
  findRefreshToken(tokenId: string): Promise<RefreshToken | null>;
  invalidateRefreshToken(tokenId: string): Promise<void>;
}
Mapping Strategy:
createRefreshToken → Will need to be split into logic in service layer

validateRefreshToken → Will move to service layer logic

revokeRefreshToken → Maps to invalidateRefreshToken but needs ID extraction

Other methods (revokeAllUserTokens, getUserActiveTokens, updateTokenVersion) →
Need to stay in API layer or be reimplemented differently

UserRepository Mapping
Temporary Interface (Current):
typescript
interface UserRepository {
  findByEmail(params: FindUserByEmailParams): Promise<User | null>;
  findById(params: FindUserByIdParams): Promise<User | null>;
  create(params: CreateUserParams): Promise<User>;
  update(params: UpdateUserParams): Promise<User>;
  updateTokenVersion(userId: string, increment?: number): Promise<void>;
  existsByEmail(email: string): Promise<boolean>;
}
Auth-Core Contract (Target):
typescript
interface UserRepository {
  findById(userId: string): Promise<User | null>;
  updateLoginAttempts(userId: string, attempts: number): Promise<void>;
  lockAccount(userId: string): Promise<void>;
  isAccountLocked(userId: string): Promise<boolean>;
  recordFailedAttempt(userId: string): Promise<void>;
  resetFailedAttempts(userId: string): Promise<void>;
}
Mapping Strategy:
findById → Direct mapping (but auth-core User type is simpler)

Other find/create/update methods → Need to stay in API layer

Security methods (updateLoginAttempts, lockAccount, etc.) → Need to be implemented

Key Differences:
Simpler Domain Models: Auth-core has simpler User/RefreshToken types

Different Method Set: Auth-core focuses on security operations

Missing Business Logic: Many current methods don't exist in auth-core

Integration Options:
Update Auth-Core: Add missing methods (breaks MVP scope)

Update Adapters: Implement only auth-core contracts, move other logic to service layer

Adapter Wrapper: Create wrapper that implements both interfaces

Recommendation:
Option 2: Update adapters to implement auth-core contracts, keep other methods as
separate repository interfaces in API layer. This keeps auth-core minimal while
allowing API to have extended functionality.

