# HelixCRM - Modular Multi-Tenant CRM Platform

## ��� Documentation

**Single Source of Truth**: [docs/SSOT.md](docs/SSOT.md)

### Core Documentation

1. **[SSOT.md](docs/SSOT.md)** - Constitutional document (vision, strategy, rules)
2. **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture & design
3. **[SECURITY.md](docs/SECURITY.md)** - Security architecture & compliance
4. **[API_CONTRACTS.md](docs/API_CONTRACTS.md)** - Stable API contracts
5. **[OPERATIONS.md](docs/OPERATIONS.md)** - Deployment & operations

### Quick Links

- [Development Setup](docs/OPERATIONS.md#development-setup)
- [API Reference](docs/API_CONTRACTS.md#stable-endpoints-mvp-v10)
- [Security Guidelines](docs/SECURITY.md)
- [Project Structure](docs/ARCHITECTURE.md#system-overview)

## ��� Quick Start

### Prerequisites

- Node.js 18+
- Docker Desktop
- Git

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start services
docker-compose -f docker/docker-compose.yml up -d

# 3. Setup database
cd apps/api
npx prisma migrate dev
npx prisma generate

# 4. Start development server
npm run start:dev
Verify Installation
bash
curl http://localhost:3000/health
# Should return: {"status":"ok","service":"helixcrm-api"}
���️ Project Structure
text
helixcrm/
├── docs/               # Documentation (SSOT-based)
├── apps/               # Deployable applications
│   ├── api/           # NestJS backend API
│   └── web/           # React frontend
├── packages/           # Shared modules (future)
├── docker/            # Docker configurations
└── scripts/           # Development scripts
��� Development
Key Scripts
Script	Purpose
npm run start:dev	Start API development server
npx prisma studio	Database GUI (http://localhost:5555)
./test-mvp.sh	Run MVP validation tests
./dev.ps1 docker-up	Start all Docker services
Testing
bash
# Run MVP validation tests
./test-mvp.sh

# Test authentication flows
./test-auth-simple.sh

# Verify CSRF protection
./verify-csrf-fixes.sh
��� Current Status
MVP: ✅ Complete (Authentication, Contacts, Multi-tenancy, RBAC)

Phase: Enterprise Hardening & Modularization

Documentation: SSOT-based governance established

Architecture: Ready for modular extraction

��� Contributing
Consult SSOT.md for strategic direction

Follow documentation governance in README.md

Update relevant core documentation for changes

Archive historical documents in docs/_archive/

��� Support
Architecture: ARCHITECTURE.md

Security: SECURITY.md

API Integration: API_CONTRACTS.md

Operations: OPERATIONS.md

Strategic Direction: SSOT.md

Remember: When in doubt, consult SSOT.md - the constitutional document of HelixCRM.
```
