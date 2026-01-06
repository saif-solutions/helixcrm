# GATE 1: AUTHENTICATION INTEGRITY TEST

## Test Objectives
1. Verify token version invalidation works (DB change → immediate 401)
2. Verify frontend handles 401 correctly (auto-logout, no infinite loops)
3. Verify no token leakage in logs
4. Document storage strategy

## Pre-requisites
- API running: http://localhost:3000
- Database accessible
- Test user credentials available

## Manual Test Steps

### Test 1: Token Version Invalidation
1. Login with a test user and capture JWT token
2. Directly update user.tokenVersion in database:
   ```sql
   UPDATE users SET tokenVersion = tokenVersion + 1 WHERE email = 'test@example.com';
   ```
3. Use the same JWT token to call a protected endpoint
4. Expected Result: 401 Unauthorized

### Test 2: Frontend 401 Handling
1. Login in frontend
2. Manually change tokenVersion in DB
3. Trigger any API call from frontend
4. Expected Result:
  - Frontend redirects to login page
  - No infinite retry loops
  - Clean logout

### Test 3: Token Leakage Check
1. Check log files for any JWT token exposure:
# Check API logs
find ./logs -name "*.log" -exec grep -l "Bearer\|Authorization\|token" {} \;
2. Expected Result: No JWT tokens in logs

### Test 4: Storage Strategy
#### Verify localStorage usage:
  - Tokens stored in localStorage (acceptable for MVP)
  - Document decision for Phase 2 review

## Success Criteria
  - Token invalidation works (DB change → 401)
  - Frontend handles 401 gracefully
  - No token leakage in logs
  - Storage strategy documented

## Notes
This is manual testing for MVP. Automated tests will be added in Phase 2.
