# GATE 3: LOGGING USEFULNESS TEST

## Test Objectives
1. Verify logs answer critical questions for security audits
2. Verify no sensitive data leakage in logs
3. Test logging across different scenarios

## Critical Questions Logs Must Answer
1. Who did what? (userId + action)
2. To which tenant? (organizationId)
3. Did it succeed or fail? (outcome + status code)

## Test Scenarios

### Scenario 1: Successful CRUD Operation
1. User creates a contact (successful)
2. Check logs for:
   - timestamp
   - requestId (correlation ID)
   - userId (should be present)
   - organizationId (should be present)
   - action: "Contact created" or similar
   - outcome: success
   - contactId (for traceability)

### Scenario 2: Failed Authentication Attempt
1. Attempt login with wrong password
2. Check logs for:
   - timestamp
   - requestId
   - userId: null or missing (since not authenticated)
   - organizationId: null or missing
   - action: "Authentication failed"
   - outcome: failure
   - error message (generic, no sensitive data)
   - NO password in logs

### Scenario 3: Forbidden Tenant Access Attempt
1. User A tries to access User B data (from Gate 2 Test 1)
2. Check logs for:
   - timestamp
   - requestId
   - userId: User A's ID
   - organizationId: User A's org ID
   - action: "Unauthorized access attempt"
   - outcome: failure (403/404)
   - target resource ID that was attempted
   - NO sensitive data from target resource

### Scenario 4: Error Condition
1. Trigger a validation error (e.g., invalid email format)
2. Check logs for:
   - Error details for developers
   - Stack trace (in development only)
   - Generic error message for audit trail
   - NO sensitive user data in error details

## Log File Locations
- Combined logs: logs/combined.log
- Error logs: logs/error.log
- API logs: apps/api/logs/

## Success Criteria
- All 4 scenarios produce logs with required fields
- No JWT tokens in logs
- No passwords in logs
- No sensitive contact data in logs
- Correlation IDs flow through request lifecycle
- Development vs Production logging differs appropriately

## Verification Commands
Check for token leakage:
```bash
Command: grep -r "Bearer\|Authorization\|eyJ" logs/ apps/api/logs/ 2>/dev/null || echo "No tokens found"
```
Check for password leakage:
```bash
Command: grep -r "password\|Password\|PASSWORD" logs/ apps/api/logs/ 2>/dev/null | grep -v "passwordHash\|password.*hash"
```
## Notes
Logging is critical for security audits and debugging.
This is MVP-complete logging, not enterprise-complete.
