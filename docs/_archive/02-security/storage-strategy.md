# STORAGE STRATEGY DOCUMENTATION (MVP)

## Current Implementation (MVP Phase)

### Frontend Token Storage
- Method: localStorage
- Items stored:
  1. helixcrm_token (JWT access token)
  2. helixcrm_user (user object without sensitive data)
- Rationale for MVP:
  - Simplest implementation
  - Works for MVP pilot (2-3 users)
  - Easy to implement logout/cleanup

### Security Considerations
1. XSS Vulnerability: localStorage accessible via JavaScript if XSS exists
2. Token Lifetime: JWT expires in 15 minutes (short-lived)
3. No Refresh Token: Simple implementation for MVP
4. Logout Mechanism: Clears localStorage

### Backend Session Management
- Stateless: No server-side sessions
- Token Validation: JWT verification + tokenVersion check
- Token Invalidation: Increment tokenVersion in database

## Phase 2 Improvements Planned

### Frontend (Post-MVP)
1. Evaluate httpOnly cookies vs localStorage
2. Implement refresh token rotation
3. Add token auto-refresh before expiry
4. Consider session storage for sensitive data

### Backend (Post-MVP)
1. Add refresh token mechanism
2. Implement token blacklisting for immediate revocation
3. Add rate limiting per user/IP
4. Implement brute-force protection

## MVP Assumptions
1. Pilot users are trusted (internal or carefully vetted)
2. Short pilot duration (days to weeks)
3. No sensitive financial/health data in MVP
4. Basic browser security assumptions hold

## Audit Trail
- All authentication events logged
- Token version changes logged
- Failed authentication attempts logged
- No sensitive data in logs

## Decision Log
- 2026-01-06: Chose localStorage for MVP simplicity
- 2026-01-06: 15-minute token expiry for security
- 2026-01-06: No refresh tokens for MVP simplicity
- 2026-01-06: Manual token invalidation via tokenVersion

## Review Schedule
- Post-pilot: Security review before Phase 2
- Phase 2: Implement improved storage strategy
- Production: Full security audit required
