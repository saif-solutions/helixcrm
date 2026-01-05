# HelixCRM API

## Overview
NestJS backend API for HelixCRM platform.

## Quick Start
1. Ensure Docker is running: `.\dev.ps1 docker-up` (from root)
2. Install dependencies: `npm install`
3. Start development: `npm run start:dev`

## API Endpoints
- `GET /` - Welcome message
- `GET /health` - Health check

## Development
```bash
# Development mode
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

Database
URL: localhost:5432

Database: helixcrm

GUI: npx prisma studio

Environment Variables
See .env.example for required variables
