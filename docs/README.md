# HelixCRM Documentation

## Ì≥ö Documentation Structure

This documentation follows the **Single Source of Truth (SSOT)** principle. All documentation is centralized in these 5 core documents:

### Core Documents
1. **[SSOT.md](SSOT.md)** - **CONSTITUTIONAL DOCUMENT**
   - Vision & strategy
   - Operating model
   - MVP definition
   - Enterprise rules
   - **Always authoritative in case of conflicts**

2. **[ARCHITECTURE.md](ARCHITECTURE.md)**
   - System architecture
   - Technology stack
   - Module boundaries
   - Scalability strategy

3. **[SECURITY.md](SECURITY.md)**
   - Authentication & authorization
   - RBAC model
   - Tenant isolation
   - Security compliance

4. **[API_CONTRACTS.md](API_CONTRACTS.md)**
   - Stable API endpoints
   - Versioning policy
   - Response formats
   - Breaking change rules

5. **[OPERATIONS.md](OPERATIONS.md)**
   - Development setup
   - Deployment procedures
   - Environment configuration
   - Troubleshooting

## Ì∫Ä Getting Started

### Quick Start
```bash
# Clone repository
git clone <repository-url>

# Start services
docker-compose -f docker/docker-compose.yml up -d

# Setup and run
cd apps/api
npm install
npx prisma migrate dev
npm run start:dev
Verification
bash
curl http://localhost:3000/health
# Should return: {"status":"ok","service":"helixcrm-api"}
Ì≥Å Archive
Historical documents, phase reports, and legacy documentation are preserved in:

/_archive/ - Read-only historical reference

Ì¥Ñ Governance Rules
Documentation Principles
SSOT is authoritative - All decisions must align with SSOT.md

No duplication - Information lives in exactly one place

Current state only - No historical/phase docs in active documentation

Link, don't repeat - Reference sections instead of copying content

Forbidden in Active Docs
Phase completion reports

Temporary status updates

Personal notes

Historical decision logs

Where Those Belong
GitHub Issues

PR descriptions

Commit messages

/_archive/ folder

Ì¥ù Contributing
Check SSOT.md for strategic direction

Update relevant core document(s)

Ensure no duplication with existing docs

Move outdated content to /_archive/

Reference SSOT sections where applicable

‚ùì Help & Support
Architecture questions: ARCHITECTURE.md

Security concerns: SECURITY.md

API integration: API_CONTRACTS.md

Deployment issues: OPERATIONS.md

Strategic direction: SSOT.md

Remember: When in doubt, consult SSOT.md - it's the constitutional document of HelixCRM.

## Ì≥ú Documentation Governance (From SSOT.md)

### Allowed Documentation
- Architecture specifications
- Security protocols  
- API contracts
- Operations procedures
- Standards and guidelines

### Forbidden in Active Docs
- Phase completion reports
- Temporary status updates
- Personal notes
- Historical decision logs

### Archive Policy
- Historical documents ‚Üí `/docs/_archive/`
- Phase reports ‚Üí `/docs/_archive/`
- Governance docs superseded by SSOT ‚Üí `/docs/_archive/`

### Conflict Resolution
When documentation conflicts arise:
1. SSOT.md is always authoritative
2. Update other docs to align with SSOT
3. Archive outdated versions
4. Document the resolution

## Ì¥ç Verification Checklist
- [x] SSOT.md established as constitutional document
- [x] 5 core documentation files created
- [x] Historical docs moved to `/docs/_archive/`
- [x] No duplicate content across active docs
- [x] All docs reference SSOT where applicable
