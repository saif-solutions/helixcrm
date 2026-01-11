# Security Architecture

## Overview

Enterprise-grade security implementation for HelixCRM SaaS platform following OAuth2 standards.

---

## Authentication & Authorization Flow

### Token Types & Lifetimes

| Token Type    | Storage               | Expiry     | Purpose                   |
|---------------|-----------------------|------------|---------------------------|
| Access Token  | HttpOnly Cookie       | 15 minutes | API authentication        |
| Refresh Token | Database (hashed)     | 7 days     | Obtain new access tokens  |
| CSRF Token    | localStorage + Cookie | Session    | Prevent CSRF attacks      |

---

### Login Flow

1. User submits credentials
2. Validate credentials → Generate tokens
3. Store in DB:
   - `refreshTokenHash`
   - `refreshTokenVersion`
4. Set cookies:
   - `access_token` (HttpOnly)
   - `refresh_token` (HttpOnly)
5. Return:
   - `access_token` in response body (for convenience)

---

### Token Rotation & Replay Protection

```typescript
// Critical: Version binding prevents token reuse
if (user.refreshTokenVersion !== payload.version) {
  // Security breach detected - invalidate all tokens
  throw new UnauthorizedException('Refresh token reuse detected');
}
```

---

## CSRF Protection System

### Implementation

**Backend**
- csurf middleware with cookie-based tokens

**Frontend**
- Automatic `X-CSRF-Token` header injection

**Validation**
- Double-submit cookie pattern

---

### Flow

1. Frontend: `GET /auth/csrf-token` → receives token
2. Frontend: Stores token in `localStorage`
3. Frontend: Auto-attaches token to non-GET requests
4. Backend: Validates header matches cookie value
5. On failure: Returns `403`, frontend refreshes token

---

### Configuration

```typescript
// SecurityConfig.csrf
{
  cookieName: '_csrf',
  headerName: 'X-CSRF-Token',
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  cookie: { httpOnly: true, secure: true, sameSite: 'strict' }
}
```

---

## Database Security Model

### Refresh Token Storage Schema (Prisma)

```prisma
model User {
  // Token Security
  refreshTokenHash     String?   @db.VarChar(255)  // bcrypt hash
  refreshTokenVersion  String?   @db.VarChar(255)  // Unique version per token
  refreshTokenIssuedAt DateTime?                   // Token issuance time
  tokenVersion         Int       @default(1)       // Global invalidation counter

  // Indexes for performance & security
  @@index([refreshTokenHash])        // Quick token validation
  @@index([refreshTokenVersion])     // Replay detection
  @@index([refreshTokenIssuedAt])    // Expiration management
}
```

---

## Security Measures

- **Hashing:** bcrypt with 10 rounds for refresh tokens
- **Version Binding:** Each token has unique version stored in DB
- **Atomic Updates:** Transactions prevent race conditions
- **Automatic Breach Response:** Token reuse triggers global invalidation

---

## Request Flow & Correlation

### Request ID Propagation

```
Client Request → X-Request-ID Header → Middleware →
Logger (attaches ID) → Services → Response (echoes ID) → Client
```

---

### Structured Logging Format

```json
{
  "requestId": "uuid-v4",
  "timestamp": "ISO-8601",
  "userId": "uuid-or-null",
  "event": "security_event_type",
  "ip": "client_ip",
  "userAgent": "client_browser",
  "metadata": { }
}
```

---

## Security Headers Implementation

### HTTP Headers Configuration

```typescript
// helmet.js configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

### Headers Deployed

| Header                    | Purpose              | Value                 |
|---------------------------|----------------------|-----------------------|
| X-Request-ID              | Request correlation  | UUID v4               |
| Content-Security-Policy   | XSS prevention       | Strict policy         |
| X-Content-Type-Options    | MIME sniffing        | nosniff               |
| X-Frame-Options           | Clickjacking         | SAMEORIGIN            |
| Strict-Transport-Security | HTTPS enforcement    | max-age=31536000      |

---

## Cookie Security Configuration

### Development vs Production

```typescript
// SecurityConfig.cookies
accessToken: () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/',
  maxAge: 15 * 60 * 1000,
}),

refreshToken: () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}),
```

---

## Monitoring & Alerting

### Security Events Monitored

- Failed authentication (>5 attempts from same IP)
- Token reuse attempts
- CSRF validation failures
- Rate limit breaches

---

### Alert Channels

- Immediate: Slack / Email for security breaches
- Daily: Security dashboard updates
- Weekly: Comprehensive security report

---

## Compliance & Standards

### Standards Implemented

- OWASP Top 10 (A2, A5, A7)
- OAuth 2.0 (RFC 6749)
- GDPR compliance
- ISO 27001 framework

---

### Audit Trail

- All security events logged with full context
- Immutable audit logs retained for 90 days
- Regular security review processes

---

## Deployment Security

### Environment-specific Configurations

| Environment | Secure Cookies | HSTS     | CORS Origin                 |
|-------------|----------------|----------|-----------------------------|
| Development | false          | Disabled | http://localhost:3000      |
| Staging     | true           | Enabled  | https://staging.example.com|
| Production  | true           | Preload  | https://app.example.com    |

---

## Secrets Management

- Environment variables for all secrets
- JWT secrets rotated quarterly
- Database credentials rotated monthly
- API keys with minimal permissions

---

## Incident Response Integration

### Automated Responses

- Token reuse → Global token invalidation + user notification
- Brute force → IP rate limiting + account lockout
- CSRF attacks → Token invalidation + suspicious activity logging

---

### Manual Response Procedures

Documented in `incident-response.md`

---

End of document.
