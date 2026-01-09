# HELIX ENTERPRISE PLATFORM

## 🚨 GOVERNANCE STATUS: PHASE 0 COMPLETE - FEATURE FREEZE ACTIVE

### 🔴 IMMEDIATE NOTICE
- **Feature Freeze:** Active - No new features until Phase 1 completion
- **Work Allowed:** Only Phase 1 hardening items (security, standardization, UX)
- **Version Tag:** `v0.9.0-pre-enterprise` - Enterprise baseline established
- **Team Acknowledgment Required:** All team members must acknowledge freeze

## 📚 AUTHORITATIVE DOCUMENTATION

### PRIMARY AUTHORITY (BINDING):
- **[Operational Canonical SSOT](docs/00-master/HELIX_Enterprise-Operational_Canonical_SSOT.md)** - Technical implementation rules 🔴
- **[Strategic Reference](docs/00-master/HELIX_PLATFORM_FLAGSHIP-Strategic_Reference.md)** - Business decisions
- **[Document Governance](docs/00-master/DOCUMENT_GOVERNANCE.md)** - Documentation rules

### SOURCE DOCUMENTS (REFERENCE):
- `docs/project-docs/HelixCRM.docx` - Technical specifications
- `docs/project-docs/SSoR.docx` - Platform constitution
- `docs/project-docs/Phases.docx` - Execution plan
- `docs/project-docs/report-tree_2026-01-08.docx` - Gap analysis

## 🚀 QUICK START
```bash
# Development Setup
npm install
.\dev.ps1 docker-up
cd apps/api && npm run start:dev

# Access Points
API: http://localhost:3000
Frontend: http://localhost:5173
Health: http://localhost:3000/health
```

## 🏗️ PROJECT STATUS
- Current Phase: 0 - Governance & Foundation ✅ COMPLETE
- Version: v0.9.0-pre-enterprise (tagged)
- MVP: Functional (Auth + Contacts CRUD + Multi-tenancy)
- Documentation: Enterprise structure established
- Governance: Feature freeze active
- Next Phase: 1 - Enterprise Hardening & UX Elevation
  - Focus: Security hardening, standardization, design system
  - Duration: 2-3 weeks
  - Prerequisite: Team acknowledgment of feature freeze

## 📁 PROJECT STRUCTURE
```
helixcrm/
├── docs/00-master/          # 👑 Authority documents
├── docs/01-architecture/    # Technical design
├── docs/02-security/        # Security standards
├── docs/03-observability/   # Monitoring
├── docs/04-product/         # Product docs
├── docs/05-operations/      # Operations
├── docs/06-development/     # Development
├── docs/07-roadmap/         # Planning
├── docs/archive/            # Historical
├── docs/project-docs/       # Source Word docs
├── apps/api/                # NestJS backend
└── apps/web/                # React frontend
```

## 🔐 SECURITY NOTE
- PILOT STATUS: Trusted users only. Production hardening scheduled for Phase 1.

## 📞 GOVERNANCE CONTACTS
- Technical Authority: Tech Lead (SSOT interpretation)
- Scope Authority: Project Owner/PM (Phase boundaries)
- Security Authority: Security Lead (Hardening approval)
- Documentation Authority: Documentation Lead (Updates)

## ⚠️ COMPLIANCE REQUIREMENT
All work must:
- Reference relevant SSOT sections
- Comply with Phase 1 scope boundaries
- Follow change control process
- Update documentation as needed

**Last Updated:** $(date +"%Y-%m-%d")  
**Governance Freeze:** GOVERNANCE_PHASE0_FEATURE_FREEZE.md  
**Version Tag:** v0.9.0-pre-enterprise  
**Authority:** Operational Canonical SSOT
