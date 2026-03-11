# @helixcrm/auth-core

**Version:** 0.1.0  
**Status:** MVP-1 (Experimental)  
**Purpose:** Minimal authentication primitives for HelixCRM MVP

## 📦 Overview

`@helixcrm/auth-core` is the extracted authentication module from HelixCRM. It provides pure authentication primitives without framework dependencies.

### MVP Scope (v0.1)

- JWT token issuance and validation
- Refresh token management
- Password hashing and verification
- Basic account lockout checks

### What It Is NOT (v0.1)

- HTTP controllers or middleware
- Database access layer
- OAuth/SAML/SSO providers
- Multi-factor authentication
- Session management UI

## 🚀 Installation

```bash
# From within the monorepo (development)
# This package is consumed internally by apps/api

# For external usage (post-MVP-1):
# npm install @helixcrm/auth-core
📖 Usage
Basic Token Operations
typescript
import { createAuthCore } from '@helixcrm/auth-core';

// Create auth core instance
const auth = createAuthCore({
  jwtSecret: process.env.JWT_SECRET,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
});

// Issue access token
const accessToken = auth.issueAccessToken({
  sub: 'user-123',
  org: 'org-456',
  role: 'user',
  version: 1,
});

// Validate token
const payload = auth.validateAccessToken(accessToken);
// payload: { sub, org, role, iat, exp, version }

// Password operations
const hash = await auth.hashPassword('my-password');
const isValid = await auth.verifyPassword('my-password', hash);
Integration with HelixCRM API
The API implements the required repository interfaces:

typescript
// In apps/api - implementing TokenRepository
class PrismaTokenRepository implements TokenRepository {
  async saveRefreshToken(token: RefreshToken) {
    // Save to database using Prisma
  }

  async findRefreshToken(tokenId: string) {
    // Lookup from database
  }
}
🏗️ Architecture
Package Structure
text
packages/auth-core/
├── src/
│   ├── contracts/     # Type definitions only
│   │   └── auth.contract.ts
│   ├── core/          # Pure implementations
│   │   ├── jwt.service.ts
│   │   ├── password.service.ts
│   │   └── token-manager.service.ts
│   └── index.ts       # Public API
Dependencies
text
@helixcrm/auth-core → jsonwebtoken, bcrypt
apps/api → @helixcrm/auth-core (one-way dependency)
🔒 Security Considerations
Token Security
JWT tokens signed with HS256

Refresh tokens stored as hashes in database

Token versioning for mass invalidation

Short expiration times (15min access, 7d refresh)

Password Security
BCrypt with cost factor 12

Automatic salt generation

Timing-attack resistant comparison

🧪 Testing
bash
# Run contract verification tests
cd tests/contracts/auth
npm test

# Run package unit tests
cd packages/auth-core
npm test
📈 Versioning
Current: 0.1.0
Experimental/internal use only

No backward compatibility guarantees

Safe for MVP-1 iteration

Future: 1.0.0 (Post-MVP-1)
Stable API surface

Backward compatibility promises

Ready for external consumption

🤝 Contributing
Contract-First: Update /tests/contracts/auth/ before changing implementation

No Framework Dependencies: Keep package pure TypeScript

MVP Scope: Respect boundaries in /docs/MVP_AUTH_BOUNDARIES.md

Tests Required: All changes must have corresponding tests

📄 License
MIT © HelixCRM
```
