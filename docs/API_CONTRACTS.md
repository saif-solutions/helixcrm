# HelixCRM API Contracts

## Versioning
- Current API version: `v1`
- Version in URL: `/api/v1/`
- Breaking changes require version increment
- Deprecation period: 6 months

## Authentication
All endpoints (except public ones) require:
- Valid JWT token in `Authorization` header or HTTP-only cookie
- CSRF token for state-changing operations (POST, PUT, PATCH, DELETE)
- Header: `X-CSRF-Token`

## Response Format
### Success
```json
{
  "data": {...},
  "message": "Operation successful",
  "timestamp": "2026-01-30T03:15:00Z"
}
Error
json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": [...]
  },
  "timestamp": "2026-01-30T03:15:00Z"
}
Common Headers
Header	Required	Description
Authorization	Yes	Bearer <jwt-token>
X-CSRF-Token	For mutating requests	CSRF protection
Content-Type	Yes	application/json
Accept	Optional	application/json
Stable Endpoints (MVP v1.0)
Health Check
text
GET /api/v1/health
No authentication required.

Authentication
text
POST /api/v1/auth/register
POST /api/v1/auth/login  
POST /api/v1/auth/logout
POST /api/v1/auth/refresh-token
GET  /api/v1/auth/csrf-token
Users
text
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id
Contacts
text
GET    /api/v1/contacts
GET    /api/v1/contacts/:id
POST   /api/v1/contacts
PUT    /api/v1/contacts/:id
DELETE /api/v1/contacts/:id
Deals
text
GET    /api/v1/deals
GET    /api/v1/deals/:id
POST   /api/v1/deals
PUT    /api/v1/deals/:id
DELETE /api/v1/deals/:id
Pipelines
text
GET    /api/v1/pipelines
GET    /api/v1/pipelines/:id
POST   /api/v1/pipelines
PUT    /api/v1/pipelines/:id
DELETE /api/v1/pipelines/:id
Analytics
text
GET /api/v1/analytics/revenue
GET /api/v1/analytics/deals
Dashboard
text
GET /api/v1/dashboard/stats
RBAC
text
GET /api/v1/rbac/roles
GET /api/v1/rbac/permissions
Pagination
For list endpoints:

text
GET /api/v1/contacts?page=1&limit=20&sort=createdAt&order=desc
Response includes:

json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
Filtering
Basic filtering supported:

text
GET /api/v1/contacts?status=active&company=Tech
Tenant Context
All endpoints automatically:

Filter by current user's organization

Require valid organization context

Enforce RLS policies

Rate Limiting
Authentication endpoints: 5 requests per minute

Other endpoints: 100 requests per minute

Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

Breaking Change Policy
Minor changes: Add fields, new endpoints

Major changes: Remove fields, change behavior → New API version

Deprecation notice in response headers: Deprecation: true

Sunset period: 6 months after deprecation

Documentation Updates
API contracts updated before deployment

Changes communicated via changelog

Backward compatibility maintained within major version
