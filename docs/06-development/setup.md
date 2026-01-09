# Development Setup

## Prerequisites
- Node.js 18 or higher
- Docker Desktop (for PostgreSQL + Redis)
- Git
- PowerShell (Windows) or Bash (Mac/Linux)

## 2. Install Dependencies
```bash
# From the project root
npm install

# This installs:
# - Root dependencies (turbo, prettier, typescript)
# - API dependencies (NestJS, Prisma, etc.)
# - Shared package dependencies

3. Start Docker Services
bash
# Windows PowerShell
.\dev.ps1 docker-up

# Alternative (any platform)
docker-compose -f docker/docker-compose.yml up -d

# This starts:
# - PostgreSQL 15 on port 5432
# - Redis 7 on port 6379
4. Database Setup
bash
# Navigate to API folder
cd apps/api

# Run database migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# (Optional) Seed database
# Note: Seed script needs configuration in package.json
5. Start Development Server
bash
# From apps/api directory
npm run start:dev

# Server starts on: http://localhost:3000
Verification
After setup, verify everything is working:

API Health Check:

bash
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"...","service":"helixcrm-api"}
Database Connection:

bash
# Check if PostgreSQL is running
docker ps | findstr postgres
Prisma Studio (Database GUI):

bash
npx prisma studio
# Opens at: http://localhost:5555
Project Structure
text
helixcrm/
├── apps/
│   └── api/                 # Backend API (you work here)
│       ├── src/            # Source code
│       ├── prisma/         # Database schema
│       └── package.json    # API dependencies
├── docker/                 # Docker configurations
├── docs/                  # Documentation
└── package.json           # Root dependencies
Common Issues & Solutions
Issue: "npm install" fails
Solution: Clear npm cache and try again:

bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
Issue: Docker services won't start
Solution: Ensure Docker Desktop is running and has enough resources allocated (minimum 4GB RAM).

Issue: Database connection error
Solution: Check if ports are available:

bash
# Check if ports are in use
netstat -ano | findstr :5432  # PostgreSQL
netstat -ano | findstr :6379  # Redis
Issue: Prisma migration errors
Solution: Reset database and remigrate:

bash
npx prisma migrate reset
npx prisma migrate dev
Development Workflow
Make changes in apps/api/src/

Server auto-reloads in development mode

Test endpoints using curl, Postman, or browser

Check logs in terminal where server is running

Useful Commands Reference
Command	Purpose	Location
npm run start:dev	Start dev server	apps/api/
npm run build	Build for production	apps/api/
npx prisma studio	Database GUI	apps/api/
npx prisma migrate dev	Create migration	apps/api/
.\dev.ps1 docker-up	Start all services	Project root
.\dev.ps1 docker-down	Stop all services	Project root
Next Steps After Setup
Verify API is running: http://localhost:3000/health

Explore database with Prisma Studio: http://localhost:5555

Review API code structure in apps/api/src/

Check documentation in docs/ folder

