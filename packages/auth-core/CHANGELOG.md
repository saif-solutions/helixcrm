# Changelog

All notable changes to the `@helixcrm/auth-core` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-31

### Added

- Initial release of auth-core package
- Core authentication contracts:
  - `AuthCoreContract`: Main authentication interface
  - `TokenRepository`: Refresh token persistence interface
  - `UserRepository`: User security operations interface
- Security services:
  - `JwtService`: JWT token issuance and validation
  - `PasswordService`: Password hashing and verification
  - `TokenManagerService`: Token lifecycle management
- Factory function: `createAuthCore()` for dependency injection
- TypeScript definitions for all contracts
- Unit tests for core security operations

### Security Features

- Password hashing with bcrypt
- JWT token signing and validation
- Refresh token management with version binding
- Account lockout after failed attempts
- Token replay protection

### Integration Features

- Dependency injection support
- Configurable token expiration
- Extensible repository interfaces
- Transaction-aware operations
- Multi-tenant support (organization-based)

### Technical Details

- Written in TypeScript with strict type checking
- Zero runtime dependencies (only dev dependencies)
- ES6 module exports
- Comprehensive JSDoc documentation
- MIT License

### Usage

```typescript
import { createAuthCore } from '@helixcrm/auth-core';

const authCore = createAuthCore(
  {
    jwtSecret: 'your-secret-key',
    refreshTokenSecret: 'your-refresh-secret',
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
  },
  {
    tokenRepository: yourTokenRepository,
    userRepository: yourUserRepository,
  }
);
Known Limitations
MVP-1 release with frozen contracts

Requires external repositories for persistence

No built-in email/password reset functionality

Focused on core authentication only

Dependencies
Peer dependency: None

Runtime dependencies: None

Dev dependencies: TypeScript, Vitest, etc.

Build
bash
cd packages/auth-core
npm run build
Test
bash
cd packages/auth-core
npm test
Future Roadmap
Planned for 0.2.0
Session management enhancements

Multi-factor authentication support

Token blacklisting

Rate limiting integration

Audit logging hooks

Planned for 1.0.0
Production readiness review

Security audit completion

Performance benchmarking

Comprehensive documentation

Migration tools from legacy auth

Note: This is the first production-grade release. Contracts are frozen for MVP-1.
Breaking changes will only occur in major version updates (1.0.0, 2.0.0, etc.).
```
