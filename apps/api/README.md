# HelixCRM API

## Overview

NestJS backend API for HelixCRM platform.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start services (from project root)
docker-compose -f ../docker/docker-compose.yml up -d

# 3. Setup database
npx prisma migrate dev
npx prisma generate

# 4. Start development server
npm run start:dev
API Endpoints
GET /health - Health check

GET /api/v1/* - Versioned API endpoints

For complete API documentation, see API_CONTRACTS.md.

Development
bash
# Development mode with hot reload
npm run start:dev

# Production build
npm run build

# Production start
npm run start:prod

# Prisma Studio (Database GUI)
npx prisma studio
Database
URL: localhost:5432

Database: helixcrm

ORM: Prisma

GUI: npx prisma studio (http://localhost:5555)

Environment Variables
Copy .env.example to .env and configure:

Database connection

JWT secrets

Redis configuration

Email service credentials

Testing
bash
# Run tests
npm run test

# Run MVP validation
./test-mvp.sh
Documentation
Architecture: ARCHITECTURE.md

Security: SECURITY.md

API Contracts: API_CONTRACTS.md

Operations: OPERATIONS.md

SSOT: SSOT.md (Constitutional document)

Database Migrations
bash
# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset
Health & Monitoring
Health endpoint: GET /health

Structured logging enabled

Request/response logging (development)

Error tracking
```
