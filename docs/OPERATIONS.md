# HelixCRM Operations

## Development Setup

### Prerequisites

- Node.js 18 or higher
- Docker Desktop (for PostgreSQL + Redis)
- Git
- PowerShell (Windows) or Bash (Mac/Linux)

### Installation

````bash
# Install dependencies
npm install

# Start Docker services
docker-compose -f docker/docker-compose.yml up -d
# Starts: PostgreSQL 15 (port 5432), Redis 7 (port 6379)

# Database setup
cd apps/api
npx prisma migrate dev
npx prisma generate

# Start development server
npm run start:dev
# Server: http://localhost:3000
Verification
bash
# API Health
curl http://localhost:3000/health
# Returns: {"status":"ok","timestamp":"...","service":"helixcrm-api"}

# Database check
docker ps | findstr postgres

# Prisma Studio (Database GUI)
npx prisma studio
# Opens: http://localhost:5555
Deployment
Local Deployment
Clone repository

Run: docker-compose -f docker/docker-compose.yml up -d

Run: cd apps/api && npm install && npm run start:dev

Verify: http://localhost:3000/health

Production Deployment
Set environment variables in .env

Build: npm run build

Run: node dist/main.js

Configure reverse proxy (Nginx/Apache)

Set up SSL certificates

Environment Configuration
Copy .env.example to .env

Set database connection strings

Configure JWT secrets

Set application port

Monitoring
Health Checks
Endpoint: /api/v1/health

Returns: Service status, database connectivity, timestamp

Logging
Structured logging enabled

Tenant context included

Error tracking

Request/response logging (development)

Database Management
Prisma migrations: npx prisma migrate dev

Database GUI: npx prisma studio

Backup: Use PostgreSQL native tools

Troubleshooting
Common Issues
npm install fails:

bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
Docker services won't start:

Ensure Docker Desktop is running

Allocate minimum 4GB RAM to Docker

Database connection errors:

bash
# Check port availability
netstat -ano | findstr :5432  # PostgreSQL
netstat -ano | findstr :6379  # Redis
Prisma migration errors:

bash
npx prisma migrate reset
npx prisma migrate dev
Useful Commands
Command	Purpose	Location
npm run start:dev	Start dev server	apps/api/
npm run build	Production build	apps/api/
npx prisma studio	Database GUI	apps/api/
npx prisma migrate dev	Create migration	apps/api/
docker-compose up -d	Start services	Project root
docker-compose down	Stop services	Project root
# Scripts & Tests Migration Guide

## Changes Made
All scripts and tests have been reorganized according to enterprise standards:

### New Structure
/tests/
├── unit/ # Pure logic tests
├── integration/ # Module interaction tests
├── contracts/ # API contract tests
└── e2e/ # End-to-end user flow tests

/scripts/
├── setup/ # Environment/bootstrap scripts
├── migration/ # Database/data migration scripts
├── maintenance/ # Cleanup/debug/optimization scripts
└── testing/ # Test execution/verification scripts

/tooling/
├── lint/ # Code quality tools
├── codegen/ # Code generation utilities
└── ci/ # CI/CD pipeline helpers

/configs/
├── feature-flags/ # Feature toggle configurations
├── branding/ # White-label theming configs
└── i18n/ # Internationalization configs

text

### What Changed
1. **All .sh files removed from `/apps/`** - Moved to appropriate `/scripts/` subdirectories
2. **Test scripts organized** - Now in `/tests/` with clear classification
3. **Debug files cleaned** - Temporary .js and .log files removed
4. **READMEs created** - Each directory documented

### Update Your Workflows
If you were using scripts directly:

**Before:**
```bash
./apps/api/test-mvp.sh
./test-auth-simple.sh
After:

bash
./tests/e2e/test-mvp.sh
./tests/integration/test-auth-simple.sh
For Developers
New scripts go in appropriate /scripts/ subdirectory

New tests go in appropriate /tests/ subdirectory

Update any documentation referencing old paths

Follow naming conventions in READMEs

Verification
Run the MVP validation to ensure everything still works:

bash
./tests/e2e/test-mvp.sh
Rationale
This reorganization enables:

Clear separation of concerns

Safe modularization

Enterprise-grade maintainability

White-label deployment readiness

Commercial module sales preparation

## Logging & Error Strategy

### Structured Logging
- Format: JSON for machine parsing
- Required Fields: timestamp, level, message, tenantId, userId, requestId
- Optional Fields: module, action, duration, errorCode

### Error Classification
| Level | Purpose | Example |
|-------|---------|---------|
| ERROR | System failures | Database connection lost |
| WARN | Recoverable issues | Cache miss, retry successful |
| INFO | Business events | User logged in, deal created |
| DEBUG | Development tracing | Request/response details |

### Correlation IDs
- Generated per request: `X-Request-ID` header
- Propagated across services
- Included in all logs for request tracing

### Tenant-Aware Logging
All logs include:
- `tenantId`: Organization identifier
- `userId`: User who initiated action (if applicable)
- `tenantContext`: For multi-tenant operations

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": [
      {"field": "email", "message": "Must be valid email"}
    ],
    "requestId": "req_123456789",
    "timestamp": "2026-01-30T04:15:00Z"
  }
}
Monitoring Integration
Logs aggregated to central system

Errors tracked with stack traces

Performance metrics collected

Alerting on error patterns
````
