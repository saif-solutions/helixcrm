# HelixCRM Operations

## Development Setup

### Prerequisites
- Node.js 18 or higher
- Docker Desktop (for PostgreSQL + Redis)
- Git
- PowerShell (Windows) or Bash (Mac/Linux)

### Installation
```bash
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
