# HelixCRM

Modular, multi-tenant CRM platform for e-commerce, travel, and service businesses.

## Quick Start
1. Clone repository
2. Run: `.\dev.ps1 setup`
3. Run: `.\dev.ps1 docker-up`
4. Run: `cd apps/api && npm run start:dev`

## Documentation
- [Architecture](docs/ARCHITECTURE.md)
- [Development Setup](docs/DEVELOPMENT_SETUP.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)

## API Status
- Health: http://localhost:3000/health
- Running: Yes (PostgreSQL + Redis via Docker)

## Project Status
Phase 0 Complete - Infrastructure ready
Phase 1 Starting - Authentication & CRM modules
