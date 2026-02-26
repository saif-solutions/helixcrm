# MVP Auth Boundaries (v0.1)

**Effective Date:** $(date +"%Y-%m-%d")  
**Authority:** Product Owner (Saif)  
**Status:** FROZEN for MVP-1

## Overview
This document defines the exact scope of MVP Authentication for HelixCRM v0.1.  
It is the authoritative source for what constitutes "MVP Auth" during module extraction.

## 🎯 MVP Auth Definition (What IS Included)

### Core Authentication Flow
1. **Email/Password Login**
   - Basic credential validation
   - Account lockout after N failed attempts
   - Password reset via email

2. **JWT Token System**
   - Access tokens (short-lived, for API authorization)
   - Refresh tokens (long-lived, for token renewal)
   - Token validation with organization context

3. **Basic Security**
   - Password hashing (bcrypt)
   - CSRF protection (stateless tokens)
   - Rate limiting (basic per-IP)
   - Account lockout mechanism

### Technical Scope (v0.1)
✅ /auth/login - Email/password login
✅ /auth/refresh - Token refresh
✅ /auth/logout - Token invalidation
✅ /auth/forgot-password - Initiate password reset
✅ /auth/reset-password - Complete password reset
✅ /auth/me - Get current user context

text

## 🚫 Explicitly OUT of MVP Auth (v0.1)

### Authentication Methods
- OAuth 2.0 providers (Google, GitHub, etc.)
- SAML/SSO integration
- Multi-factor authentication (MFA)
- Passwordless login (magic links, etc.)
- Social login buttons
- Biometric authentication

### Advanced Features
- Token rotation strategies
- Device tracking
- Session management UI
- Login history dashboard
- IP whitelisting/blacklisting
- Geolocation-based restrictions

### Enterprise IAM
- LDAP/Active Directory integration
- SCIM provisioning
- Just-in-time provisioning
- Role synchronization
- Compliance reporting

## 📐 Technical Boundaries

### In auth-core package (v0.1):
```typescript
// ✅ INCLUDED
interface AuthCoreContract {
  // JWT Operations
  issueAccessToken(payload): string;
  validateAccessToken(token): JwtPayload | null;
  
  // Refresh Token Operations  
  issueRefreshToken(userId, orgId): string;
  validateRefreshToken(token): RefreshTokenPayload | null;
  invalidateToken(tokenId): Promise<void>;
  
  // Password Operations
  hashPassword(password): Promise<string>;
  verifyPassword(password, hash): Promise<boolean>;
  
  // Security Operations
  isAccountLocked(userId): Promise<boolean>;
  recordFailedAttempt(userId): Promise<void>;
  resetFailedAttempts(userId): Promise<void>;
}
Deferred to v0.2 or later:
typescript
// ❌ EXCLUDED from v0.1
interface AuthAdvancedFeatures {
  // Token lifecycle
  rotateRefreshToken(oldToken): Promise<string>;
  invalidateAllUserTokens(userId): Promise<void>;
  getActiveSessions(userId): Promise<Session[]>;
  
  // Rate limiting
  checkRateLimit(userId, action): Promise<boolean>;
  getRateLimitStatus(userId): Promise<RateLimitStatus>;
  
  // Device management
  registerDevice(userId, deviceInfo): Promise<string>;
  revokeDevice(deviceId): Promise<void>;
  
  // Advanced security
  requireMFA(userId): Promise<boolean>;
  setupMFA(userId): Promise<MFASetup>;
  verifyMFA(userId, code): Promise<boolean>;
}
🔄 Success Criteria (MVP Auth Complete)
MVP Auth is considered DONE when:

Functional

User can log in with email/password

Access token works on protected routes

Refresh token successfully renews access

Account locks after 5 failed attempts

Password reset flow works end-to-end

Technical

All endpoints return correct HTTP status codes

Error responses follow consistent format

Tokens contain required claims (sub, org, role, iat, exp)

Password hashing uses bcrypt with proper salt rounds

Integration

Works with existing RBAC system

Respects tenant isolation boundaries

Logs authentication events to audit system

Compatible with current frontend

Quality

Contract tests pass

All existing authentication tests pass

No regression in API behavior

Performance: <100ms for token validation

📍 Decision Log
Decision: Minimal Viable Auth Surface
Date: $(date +"%Y-%m-%d")
Decision: Auth-core v0.1 exposes only essential authentication primitives required for MVP-1.
Context: Keeping surface area small enables faster extraction, testing, and stabilization.
Consequences:

✅ Faster time-to-MVP

✅ Lower risk during extraction

✅ Clear upgrade path to v0.2

⚠️ Advanced features deferred (explicitly documented)

Decision: Deferred Features Tracking
Date: $(date +"%Y-%m-%d")
Decision: Advanced auth features are tracked as GitHub issues with post-mvp-1 label.
Context: Prevents scope creep while maintaining visibility of future enhancements.
Consequences:

✅ No feature loss

✅ Clear prioritization after MVP-1

✅ Team focus maintained on core extraction

📋 Verification Checklist
Before marking MVP Auth as "Done":
All 6 auth endpoints working

Contract tests passing

Integration tests passing

Performance benchmarks met

Security audit completed

Documentation updated

DECISIONS.md entry created

This document is authoritative for MVP-1 auth scope.
Any deviation requires Product Owner approval and SSOT.md update.