# Auth-Core Integration Guide

## Overview

This document describes how to integrate and use the `@helixcrm/auth-core` package within the HelixCRM API.

## Package Installation

```bash
# Install the auth-core package
cd apps/api
npm install @helixcrm/auth-core
Version Pinning
The auth-core package should be pinned to a specific version to prevent breaking changes:

json
// package.json
{
  "dependencies": {
    "@helixcrm/auth-core": "0.1.0",  // Pinned version
    // other dependencies...
  }
}
Architecture
The integration follows a bridge pattern:

text
API Business Layer (auth.service.ts)
    ↓
AuthCoreAdapter (Bridge Layer)
    ↓    ↓
Auth-Core Services    Prisma Repositories
    ↓                    ↓
Security Logic          Database
Bridge Implementations
1. Token Repository Bridge (PrismaTokenRepositoryBridge.ts)
Implements TokenRepository from auth-core

Maps auth-core tokens to Prisma schema

Handles token ID format: userId:jti

2. User Repository Bridge (PrismaUserRepositoryBridge.ts)
Implements UserRepository from auth-core

Provides security-focused user operations

Maintains backward compatibility

Usage Example
typescript
import { AuthCoreAdapter } from './adapters/AuthCoreAdapter';

// In your service
constructor(private authAdapter: AuthCoreAdapter) {}

async login(email: string, password: string) {
  // Get auth-core instance
  const authCore = this.authAdapter.getAuthCore();

  // Use auth-core for password verification
  const user = await this.userRepository.findByEmail(email);
  if (!user) throw new Error('User not found');

  const isValid = await authCore.verifyPassword(password, user.passwordHash);
  if (!isValid) {
    await authCore.recordFailedAttempt(user.id);
    throw new Error('Invalid credentials');
  }

  // Reset failed attempts on successful login
  await authCore.resetFailedAttempts(user.id);

  // Generate tokens
  const accessToken = authCore.issueAccessToken({
    sub: user.id,
    org: user.organizationId,
    role: 'user',
    version: user.tokenVersion,
  });

  const refreshToken = await authCore.issueRefreshToken(
    user.id,
    user.organizationId
  );

  return { accessToken, refreshToken };
}
Transaction Safety
Critical refresh token operations use transactions:

typescript
// Example of transaction-safe refresh token update
await this.authAdapter.withTransaction(async ({ tokenRepository, userRepository }) => {
  // 1. Validate old refresh token
  const isValid = await tokenRepository.validateRefreshToken(params);
  if (!isValid) throw new Error('Invalid token');

  // 2. Update token version (atomic)
  await userRepository.updateTokenVersion(userId, 1);

  // 3. Save new token
  await tokenRepository.createRefreshToken(newTokenParams);

  // All operations succeed or roll back together
});
Security Considerations
Token Storage: Refresh tokens are hashed using bcrypt before storage

Token IDs: Use UUID format for token identification

Version Binding: Each refresh token is bound to a specific version

Transaction Safety: Critical operations use database transactions

Logging: No raw tokens in logs, only token IDs

Testing
Run the verification script:

bash
npx ts-node src/modules/auth/adapters/transaction-verify.ts
Troubleshooting
Common Issues:
Foreign key constraint violations: Ensure organization exists before creating users

Token validation failures: Check token version binding

Transaction rollbacks: Verify database isolation level

Debug Mode:
Enable debug logging in development:

typescript
// In AuthCoreAdapter.ts
private initializeAuthCore() {
  this.authCore = createAuthCore({
    // ... config
    debug: process.env.NODE_ENV === 'development',
  }, {
    // ... dependencies
  });
}
Migration from Legacy Auth
The system maintains backward compatibility:

Existing API interfaces remain unchanged

Legacy repositories still work alongside bridges

Gradual migration to auth-core features

Support
For issues:

Check the transaction verification script results

Review bridge implementation against auth-core contracts

Verify database schema matches expectations

Check environment variables (JWT secrets, etc.)
```
