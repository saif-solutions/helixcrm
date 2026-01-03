# HelixCRM - Modular Multi-Tenant CRM Platform

## ✅ Current Status
- **API**: NestJS backend running on localhost:3000
- **Database**: PostgreSQL schema defined with Prisma
- **Authentication**: JWT setup ready
- **Multi-tenancy**: RLS (Row-Level Security) scripts prepared
- **Docker**: Configuration ready (requires Docker Desktop)

## 🚀 Quick Start
1. **Install Docker Desktop** from https://docker.com/
2. **Start services**: `.\dev.ps1 docker-up`
3. **Run migrations**: `.\dev.ps1 db-migrate`
4. **Start development**: `.\dev.ps1 dev`

## Project Structure
helixcrm/
├── apps/
│ ├── api/ # NestJS backend (✅ RUNNING)
│ └── web/ # React frontend (coming soon)
├── packages/ # Shared modules
├── docker/ # Docker configurations
├── docs/ # Documentation
└── scripts/ # Utility scripts
## 📋 Phase 0 Complete
- ✅ Monorepo setup with Turborepo
- ✅ NestJS API with TypeScript
- ✅ PostgreSQL schema with Prisma
- ✅ Multi-tenant database design
- ✅ Health check endpoint
- ✅ Git repository & CI/CD ready
- ✅ Environment configuration

## Next Steps
1. Install Docker Desktop
2. Run database migrations
3. Implement authentication
4. Create CRM modules (Contacts, Accounts, Activities)
5. Set up frontend React application

## Technology Stack
- **Backend**: NestJS, TypeScript, Prisma ORM
- **Database**: PostgreSQL 15 with Row-Level Security
- **Cache**: Redis
- **Container**: Docker & Docker Compose
- **Monorepo**: Turborepo

## Health Check
API is running at: http://localhost:3000/health
