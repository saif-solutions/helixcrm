# HelixCRM Documentation

## 📚 Documentation Architecture

This documentation follows the **Single Source of Truth (SSOT)** principle with a clear authority hierarchy.

### 🏛 Constitutional Documents (Level 1A)
| Document | Purpose |
|----------|---------|
| [`SSOT.md`](SSOT.md) | Constitutional document - always authoritative |
| [`INVARIANTS.md`](INVARIANTS.md) | System invariants with P0-P3 severity |
| [`VOCABULARY.md`](VOCABULARY.md) | Canonical terminology definitions |

### 📋 Controlled Documents (Level 1B)
| Document | Purpose |
|----------|---------|
| [`API_CONTRACTS.md`](API_CONTRACTS.md) | API specifications and versioning |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | System architecture overview |
| [`SECURITY.md`](SECURITY.md) | Security model and controls |
| [`OPERATIONS.md`](OPERATIONS.md) | Development and deployment procedures |
| [`FRONTEND_SSOT.md`](FRONTEND_SSOT.md) | Frontend execution blueprint |
| [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md) | 4-layer test taxonomy |
| [`INVARIANT_VIOLATIONS.md`](INVARIANT_VIOLATIONS.md) | Violation response playbook |
| [`MVP_AUTH_BOUNDARIES.md`](MVP_AUTH_BOUNDARIES.md) | MVP scope definition |
| [`POST-QA-HARDENING.md`](POST-QA-HARDENING.md) | Post-QA hardening roadmap |

### 🏗 Architecture Specifications
| Location | Purpose |
|----------|---------|
| [`architecture/`](architecture/) | Detailed architecture documents |
| [`architecture/tenant-isolation-architecture.md`](architecture/tenant-isolation-architecture.md) | Tenant isolation SSOT |

### 🔐 Compliance & Governance
| Location | Purpose |
|----------|---------|
| [`compliance/`](compliance/) | Compliance and audit evidence |
| [`invariants/`](invariants/) | Invariant registry and tracking |
| [`team/`](team/) | Team process and rules |
| [`VALIDATION_SUMMARY.md`](VALIDATION_SUMMARY.md) | Governance validation snapshot |

### 📦 Archive (Historical Only)
- [`_archive/`](_archive/) - Read-only historical documents (phase reports, obsolete guides)

## 🚀 Quick Start

```bash
# Clone repository
git clone <repository-url>

# Start services
docker-compose -f docker/docker-compose.yml up -d

# Setup and run API
cd apps/api
npm install
npx prisma migrate dev
npm run start:dev
✅ Verification
bash
curl http://localhost:3000/health
# Expected: {"status":"ok","service":"helixcrm-api"}
📖 How to Use This Documentation
Start with SSOT.md for strategic direction

Check INVARIANTS.md for system truths

Use VOCABULARY.md for consistent terminology

Refer to FRONTEND_SSOT.md for frontend implementation

Follow TESTING_STRATEGY.md for test placement

🛡 Documentation Governance
Core Principles
SSOT is authoritative - All decisions align with SSOT.md

No duplication - Information lives in exactly one place

Current state only - Historical docs go to /_archive/

Link, don't repeat - Reference sections instead of copying

Conflict Resolution
SSOT.md is always authoritative

Update other docs to align with SSOT

Archive outdated versions

Document the resolution

📊 Current Documentation Status
Category	Count	Status
Constitutional (Level 1A)	3	✅ Active
Controlled (Level 1B)	11	✅ Active
Archived	4	✅ Preserved
When in doubt, consult SSOT.md - it's the constitutional document of HelixCRM.