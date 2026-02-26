# Multi-tenant Test Procedure

## Prerequisites
1. Backend running with database
2. Two test organizations created in backend
3. Two user accounts (one per organization)

## Test Steps

### Step 1: Login as Org A User
```bash
# Using curl or UI
POST /api/v1/auth/login
{
  "email": "user-a@orga.com",
  "password": "password123"
}
Step 2: List Contacts for Org A
bash
GET /api/v1/contacts
# Should only return contacts belonging to Org A
Step 3: Login as Org B User
bash
POST /api/v1/auth/login
{
  "email": "user-b@orgb.com",
  "password": "password456"
}
Step 4: List Contacts for Org B
bash
GET /api/v1/contacts
# Should only return contacts belonging to Org B
# Should NOT include Org A's contacts
Step 5: Data Isolation Verification
Note contact IDs from Org A

Try to access Org A's contacts while logged in as Org B

bash
GET /api/v1/contacts/{org-a-contact-id}
# Should return 404 or 403
Expected Results
✅ Each organization sees only its own data

✅ Cross-organization access is denied

✅ Dashboard stats reflect only organization's data

✅ No data leakage between organizations
