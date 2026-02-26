No code yet – design only
PHASE 2: MVP ARCHITECTURE & SECURITY DESIGN
Technical Lead - Architecture Definition
1. MVP FEATURE SPECIFICATION
Backend Core Features
Feature	Description	Required for MVP
Authentication	JWT-based auth with refresh tokens, password reset	Yes
User Management	CRUD for users, profile management	Yes
Tenant Isolation	Multi-tenant data separation at database level	Yes
Contacts	Full CRUD for contact management	Yes
Leads	Lead capture, qualification, progression	Yes
Deals	Deal pipeline management with stages	Yes
Pipelines	Customizable deal pipelines	Yes
Basic Analytics	Deal metrics, conversion rates	Yes
RBAC	Role-Based Access Control (Admin, Manager, User)	Yes
Audit Logging	Key action logging (create, update, delete)	Yes
Email Service	Password reset, notifications	Yes
File Uploads	Contact attachments, avatars	No (Phase 3)
Advanced Reporting	Custom reports, exports	No (Phase 3)
Integrations	Third-party API integrations	No (Phase 3)
Frontend Core Features
Feature	Description	Required for MVP
Login/Register	Authentication flows	Yes
Dashboard	Overview of key metrics	Yes
Contacts Page	List, create, edit contacts	Yes
Leads Page	Lead management interface	Yes
Deals Kanban	Visual deal pipeline	Yes
User Profile	Profile management	Yes
Admin Panel	User/tenant management	Yes
Password Reset	Self-service password reset	Yes
Responsive Design	Mobile-friendly UI	Yes
Real-time Updates	WebSocket notifications	No (Phase 3)
Advanced Filtering	Complex search/filters	No (Phase 3)
Admin Features
Feature	Description	Required for MVP
User Management	Create/edit/disable users	Yes
Role Assignment	Assign RBAC roles to users	Yes
Tenant Management	Create/configure tenants	Yes
Audit Logs	View system activity logs	Yes
System Health	Monitor API status, errors	Yes
Billing Management	Subscription handling	No (Phase 3)
2. AUTH SYSTEM DESIGN
Token Structure
text
ACCESS TOKEN (JWT):
{
  "sub": "user-uuid",
  "tenantId": "tenant-uuid",
  "email": "user@example.com",
  "roles": ["user", "admin"],
  "permissions": ["contacts:read", "contacts:write"],
  "iat": 1672531200,
  "exp": 1672532100,  // 15 minutes
  "jti": "token-uuid",
  "version": 1
}

REFRESH TOKEN (Opaque):
{
  "id": "refresh-token-uuid",
  "userId": "user-uuid",
  "tenantId": "tenant-uuid",
  "expiresAt": "2024-01-31T23:59:59Z",
  "createdAt": "2024-01-24T00:00:00Z",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "revoked": false
}
Refresh Token Strategy
text
FLOW: Access Token Refresh
1. Client sends refresh token + CSRF token
2. Server validates refresh token exists & not revoked
3. Server checks token version matches user.tokenVersion
4. Server creates new access token (15min expiry)
5. Server creates new refresh token (7 day expiry)
6. Old refresh token marked as revoked
7. Return new tokens to client

STORAGE: Redis (with TTL)
- Key: refresh:{tenantId}:{userId}:{tokenId}
- Value: serialized refresh token data
- TTL: 7 days + 24 hour grace period
Password Reset Flow
text
1. User requests password reset → POST /auth/forgot-password
2. Generate reset token (1 hour expiry, single-use)
3. Send email with reset link: /reset-password?token={token}
4. User submits new password → POST /auth/reset-password
5. Validate token, update password, invalidate all user sessions
6. Send confirmation email
Email Verification Flow
text
1. User registers → send verification email
2. Email contains: /verify-email?token={token}
3. Verify token → mark email as verified
4. If not verified within 24h, restrict certain actions
Session Invalidation Rules
text
CONDITIONS FOR SESSION INVALIDATION:
1. Password change → invalidate all sessions
2. Role/permission change → invalidate user sessions
3. Manual logout → invalidate specific session
4. Admin action → invalidate user sessions
5. Suspicious activity → invalidate all sessions for IP/user
CSRF Handling
text
IMPLEMENTATION:
1. Generate CSRF token on login
2. Store in HttpOnly cookie: XSRF-TOKEN
3. Require in header for state-changing requests: X-XSRF-TOKEN
4. Validate on server for POST/PUT/PATCH/DELETE
5. Refresh token endpoint requires CSRF validation
RBAC Enforcement Points
text
ENFORCEMENT LAYERS:
1. Route Guards (Controller level)
2. Permission Decorators (Method level)
3. Service Layer Checks (Business logic)
4. Database RLS (Row Level Security)
5. Tenant Context Middleware (Request level)

PERMISSION STRUCTURE:
{resource}:{action}
Examples: contacts:read, deals:write, users:manage
3. DATA MODEL VALIDATION
Required Changes to Prisma Schema
prisma
// MISSING CONSTRAINTS TO ADD:
1. User model:
   @@unique([email, tenantId])  // Email unique per tenant
   tokenVersion Int @default(1)  // For session invalidation
   lastPasswordChange DateTime?  // For forced password reset

2. RefreshToken model:
   @@index([userId, revoked])
   ipAddress String?
   userAgent String?

3. All tenant-owned models:
   Add: @@index([tenantId]) for performance
   Add: tenantId relation with onDelete: Cascade

4. Soft Delete Pattern:
   deletedAt DateTime?
   deletedBy String?  // User ID who performed deletion
Multi-Tenant Isolation Rules
text
DATABASE LEVEL:
1. Row Level Security (RLS) policies on all tenant tables
2. Default tenant_id filter on all queries
3. Super-admin bypass for cross-tenant operations

APPLICATION LEVEL:
1. Tenant context middleware extracts tenant from JWT
2. All service methods include tenantId in queries
3. No cross-tenant data exposure in APIs
Indexing Strategy
prisma
// REQUIRED INDEXES:
1. User: [email, tenantId] (unique)
2. RefreshToken: [userId, revoked]
3. Contact: [tenantId, createdAt]
4. Lead: [tenantId, status, createdAt]
5. Deal: [tenantId, pipelineId, stageId]
6. All foreign keys with high cardinality
4. API CONTRACT DEFINITION
Authentication Endpoints
text
POST   /auth/login              # Email/password login
POST   /auth/refresh            # Refresh access token
POST   /auth/logout             # Logout (invalidate refresh token)
POST   /auth/forgot-password    # Request password reset
POST   /auth/reset-password     # Complete password reset
POST   /auth/verify-email       # Verify email address
GET    /auth/me                 # Get current user info
User Management Endpoints
text
GET    /users                   # List users (admin only)
POST   /users                   # Create user (admin only)
GET    /users/:id               # Get user details
PATCH  /users/:id               # Update user
DELETE /users/:id               # Delete user (soft delete)
POST   /users/:id/roles         # Assign roles to user
CRM Core Endpoints
text
CONTACTS:
GET    /contacts                # List contacts
POST   /contacts                # Create contact
GET    /contacts/:id            # Get contact
PATCH  /contacts/:id            # Update contact
DELETE /contacts/:id            # Delete contact (soft delete)

LEADS:
GET    /leads                   # List leads
POST   /leads                   # Create lead
GET    /leads/:id               # Get lead
PATCH  /leads/:id               # Update lead
POST   /leads/:id/qualify       # Qualify lead → create deal

DEALS:
GET    /deals                   # List deals
POST   /deals                   # Create deal
GET    /deals/:id               # Get deal
PATCH  /deals/:id               # Update deal
POST   /deals/:id/move          # Move deal to different stage

PIPELINES:
GET    /pipelines               # List pipelines
POST   /pipelines               # Create pipeline
GET    /pipelines/:id           # Get pipeline
PATCH  /pipelines/:id           # Update pipeline
Error Response Format
json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "timestamp": "2024-01-24T10:30:00Z",
  "path": "/api/v1/contacts",
  "requestId": "req-123456789",
  "details": {
    "hint": "Please login again",
    "code": "TOKEN_EXPIRED"
  }
}
Versioning Scheme
text
API VERSIONING: URL Path
- All routes prefixed with /api/v1/
- Breaking changes require /api/v2/
- Deprecation headers for old versions
- 6-month migration period for breaking changes
5. SECURITY BASELINE
Password Policy
text
COMPLEXITY REQUIREMENTS:
- Minimum 12 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character
- No common passwords (check against breach database)
- Password history: 5 previous passwords remembered
- Maximum age: 90 days (optional for MVP)
Rate Limits
text
RATE LIMITING TIERS:
1. Authentication endpoints: 5 requests/minute per IP
2. API endpoints: 100 requests/minute per user
3. Public endpoints: 1000 requests/minute per IP
4. Admin endpoints: 50 requests/minute per user

IMPLEMENTATION: Redis-based sliding window
Token Expiry Configuration
text
TOKEN LIFETIMES:
- Access Token: 15 minutes
- Refresh Token: 7 days
- Password Reset Token: 1 hour (single-use)
- Email Verification Token: 24 hours
- Remember Me Token: 30 days (if implemented)
Audit Logging Requirements
text
MANDATORY AUDIT EVENTS:
1. User authentication (success/failure)
2. Password changes
3. Role/permission changes
4. Data deletion (soft/hard)
5. Admin actions
6. Export operations

LOG RETENTION: 90 days minimum
Brute Force Protection
text
PROTECTION MECHANISMS:
1. Account lockout after 5 failed attempts (15 minute lock)
2. IP-based rate limiting for auth endpoints
3. Progressive delays on failed attempts
4. Alert on suspicious patterns (multiple accounts from same IP)
Tenant Isolation Checks
text
VALIDATION POINTS:
1. JWT must contain tenantId claim
2. All database queries must include tenantId WHERE clause
3. No API should return data from multiple tenants
4. File storage separated by tenant
5. Cache keys prefixed with tenantId
CORS Policy
text
CORS CONFIGURATION:
- Origin: Configured allowed origins (not "*" in production)
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Headers: Content-Type, Authorization, X-XSRF-TOKEN
- Credentials: true (for cookies)
- Max-Age: 86400 (24 hours)
6. DEVOPS REQUIREMENTS (DESIGN ONLY)
Docker Architecture
text
CONTAINER ORCHESTRATION:
1. API Container (NestJS + Node.js)
2. Frontend Container (Vite/React)
3. PostgreSQL Container (with extensions)
4. Redis Container (cache + sessions)
5. Nginx Proxy (SSL termination, rate limiting)

DOCKER COMPOSE STRUCTURE:
- Development: All services in single compose
- Production: Separate compose files per environment
- Database: Persistent volumes for data
CI Pipeline Stages
text
CI/CD PIPELINE:
1. Lint & Format Check
2. TypeScript Compilation
3. Unit Tests (Jest)
4. Integration Tests (DB + Redis)
5. Security Scan (npm audit, Snyk)
6. Build Docker Images
7. Push to Container Registry
8. Deploy to Staging
9. Run E2E Tests
10. Promote to Production

BRANCH STRATEGY:
- main: Production (auto-deploy on merge)
- staging: Staging environment
- feature/*: Development branches
Secrets Handling
text
SECRETS MANAGEMENT:
1. Environment Variables (not in repo)
2. Docker Secrets for Swarm/K8s
3. HashiCorp Vault or AWS Secrets Manager for production
4. Secret rotation every 90 days
5. No hardcoded secrets in any configuration

REQUIRED SECRETS:
- JWT secrets (access + refresh)
- Database credentials
- Redis credentials
- Email service credentials
- Encryption keys
Database Migration Strategy
text
MIGRATION WORKFLOW:
1. Prisma schema changes → generate migration
2. Review migration SQL
3. Apply to development database
4. Run integration tests
5. Apply to staging database
6. Backup production before applying
7. Apply during maintenance window
8. Verify data integrity

BACKUP STRATEGY:
- Daily full backups (retain 30 days)
- Transaction log backups every hour
- Off-site backup storage
- Monthly test restoration procedure
Logging Strategy
text
LOG AGGREGATION:
1. Application Logs → JSON format
2. Structured logging with correlation IDs
3. Centralized log collection (ELK stack or equivalent)
4. Error tracking (Sentry or similar)
5. Performance monitoring (APM)

LOG LEVELS:
- Production: INFO and above
- Development: DEBUG and above
- Trace IDs for request correlation
Environment Promotion Flow
text
ENVIRONMENT PROMOTION:
Development → Staging → Production

PROMOTION GATES:
1. All tests pass
2. Security scan clean
3. Performance benchmarks met
4. Manual approval for production
5. Database migrations verified
6. Rollback plan documented
7. MVP READINESS CHECKLIST
Authentication & Security
JWT authentication with refresh tokens implemented

Password reset flow with email verification

CSRF protection enabled

Rate limiting configured

CORS properly configured

HTTPS enforced in production

Security headers configured (HSTS, CSP)

Audit logging implemented for critical actions

RBAC enforced at API level

Tenant isolation verified

Core CRM Functionality
Contact management (CRUD)

Lead management with qualification

Deal pipeline with stages

Pipeline configuration

Basic dashboard with metrics

User profile management

Admin panel for user/role management

Data Integrity
Database migrations automated

Row Level Security (RLS) implemented

Soft delete pattern consistent

Data validation at API level

Unique constraints enforced

Foreign key relationships maintained

Backup strategy implemented

DevOps & Operations
Docker configuration for all services

Environment variables externalized

CI/CD pipeline configured

Log aggregation configured

Monitoring and alerting setup

Database backups automated

Deployment rollback procedure documented

SSL certificates configured

Quality Assurance
Unit test coverage > 70%

Integration tests for critical flows

E2E tests for user journeys

Load testing completed

Security penetration test completed

Accessibility audit completed

Cross-browser testing completed

Mobile responsiveness verified

Documentation
API documentation (OpenAPI/Swagger)

Deployment guide

Developer setup guide

User documentation

Admin guide

Troubleshooting guide

Disaster recovery plan

Production Readiness
Error tracking configured

Performance monitoring setup

Uptime monitoring configured

Incident response plan documented

Support channels established

Data retention policy defined

Privacy policy and terms of service

GDPR/CCPA compliance reviewed

DECLARATION CRITERIA
"MVP Ready for First Real Users" when:

All "Required for MVP: Yes" features from Section 1 are implemented

All Security Baseline requirements from Section 5 are met

✓ All items in MVP Readiness Checklist are completed

Zero critical/high security vulnerabilities remain

Successful pilot deployment with 5-10 test users for 7 days

Performance SLA met: < 2s page load, < 200ms API response (p95)

Uptime commitment: 99.5% availability target

NEXT STEPS AFTER ARCHITECTURE APPROVAL
Implement missing Prisma constraints (Section 3)

Build security middleware (Section 2, 5)

Create Docker production configuration (Section 6)

Implement API contracts (Section 4)

Execute MVP Readiness Checklist (Section 7)

This architecture defines a production-ready, secure, scalable MVP foundation for HelixCRM.

