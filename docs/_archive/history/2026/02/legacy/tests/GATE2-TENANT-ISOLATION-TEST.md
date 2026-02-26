# GATE 2: TENANT ISOLATION TEST

## Test Objectives
1. Verify adversarial tenant isolation (User A cannot access User B data)
2. Verify never "empty success" or partial data exposure
3. Test boundary conditions thoroughly

## Pre-requisites
- Two test users in DIFFERENT organizations
- User A: org_1, has contact_A1
- User B: org_2, has contact_B1
- Both users logged in with valid tokens

## Manual Test Steps

### Test 1: Direct ID Access Attempt
1. User A logs in, gets token_A
2. User B logs in, gets token_B, creates contact_B1 (note the ID)
3. User A tries to access contact_B1 using token_A:
   ```bash
   Command: curl -H "Authorization: Bearer [token_A]" http://localhost:3000/contacts/[contact_B1_id]
   ```

4. Expected Result: 404 Not Found (or 403 Forbidden)
5. Critical: Never returns contact_B1 data

### Test 2: List Operations Isolation
1. User A lists all contacts:
```bash
   Command: curl -H "Authorization: Bearer [token_A]" http://localhost:3000/contacts
   ```
2. Expected Result: Only contacts from org_1
3. Critical: No contacts from org_2 appear, even as empty objects

### Test 3: Update/Delete Attempts
1. User A tries to update contact_B1:
   ```bash
   Command: curl -X PUT -H "Authorization: Bearer [token_A]" -H "Content-Type: application/json" -d "{\"firstName\":\"Hacked\"}" http://localhost:3000/contacts/[contact_B1_id]
   ```
2. Expected Result: 404 Not Found
3. Critical: Database should show NO CHANGE to contact_B1

### Test 4: Boundary Testing
1. Try with non-existent contact ID within same org
2. Try with malformed UUID
3. Try SQL injection patterns in IDs
4. Expected Result: Appropriate errors (404, 400) but never data from wrong org

## Success Criteria
- User A cannot read User B data (404/403)
- User A cannot update/delete User B data
- List operations return only own tenant data
- No "empty success" responses
- No partial data exposure

## Notes
This testing is CRITICAL for MVP credibility.
One failure here blocks deployment.
