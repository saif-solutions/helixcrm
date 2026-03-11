# High Signal Tests for QA Team

## (PM Recommended Focus Areas)

## ��� Maximum Value Tests

### 1. Concurrent Refresh Race Conditions

**Test**: Simulate multiple devices refreshing simultaneously

```bash
# Use parallel curl requests
for i in {1..5}; do
  curl -X POST http://localhost:3000/auth/refresh \
    -H "Cookie: refreshToken=<same_token>" &
done
Expected: Only one refresh succeeds, others get HTTP 401

2. Password Change → Token Invalidation
Test: Change password, then try to use old refresh token

bash
# 1. Login user A
# 2. Change password via PATCH /users/:id
# 3. Try to use old refresh token
Expected: HTTP 401 - All old tokens invalidated

3. Organization Boundary Enforcement
Test: User with valid token tries to access other org's data

bash
# User from Org A tries to access Org B's contacts
curl -X GET http://localhost:3000/contacts \
  -H "Authorization: Bearer <valid_token_from_org_A>"
Expected: Empty array or HTTP 403 - Can't cross org boundaries

4. Audit Log Completeness Under Failure
Test: Check audit logs for failed security events

bash
# After failed login attempts, check audit logs
curl -X GET http://localhost:3000/audit-logs \
  -H "Authorization: Bearer <admin_token>"
Expected: Each failed attempt has audit entry with correct severity

��� What to Watch For
Transaction Safety Indicators:
No "partial" token states in database

Token versions increment atomically

Failed operations don't leave orphaned data

Security Indicators:
No raw tokens in application logs

Token hashes use bcrypt (not plaintext)

Account lockout actually prevents login

Performance Indicators:
Login response < 500ms

Token refresh < 300ms

No memory leaks in long-running sessions

��� Quick Validation Checklist
Run these after the entry gate:

bash
# 1. Basic health
curl http://localhost:3000/health

# 2. Auth status
curl http://localhost:3000/auth/status

# 3. Database schema check
npx prisma db execute --file scripts/check-schema.sql

# 4. Environment verification
echo "JWT_SECRET: ${JWT_SECRET:0:5}..."
echo "NODE_ENV: $NODE_ENV"
��� Red Flags (Stop Testing If Seen)
Database connection errors during auth

Tokpersisted after logout

User can access data from wrong organization

Audit logs missing security events

Performance degradation > 50% from baseline

✅ Green Flags (Good to Proceed)
All entry gate tests pass

Transaction rollback works

Token replay protection active

Audit logs complete

Performance within 5% of baseline
```
