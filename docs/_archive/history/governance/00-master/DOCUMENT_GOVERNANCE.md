# DOCUMENT GOVERNANCE POLICY

## PURPOSE
This policy establishes rules for documentation creation, maintenance, and authority within the HELIX Platform project.

## 1. SINGLE SOURCE OF TRUTH (SSOT)

### 1.1 Authority
- `HELIX_PLATFORM_FLAGSHIP.md` is the canonical authority
- All other documentation must derive from or reference the SSOT
- No contradictory information may exist elsewhere

### 1.2 SSOT Structure
The SSOT must contain:
- Platform vision and principles
- Current state assessment
- Architecture decisions
- Security standards
- Development practices
- Roadmap and phases
- Governance rules

## 2. DOCUMENTATION STANDARDS

### 2.1 Format Requirements
- ✅ Markdown (.md) format only
- ✅ UTF-8 encoding
- ✅ Semantic line breaks at 80 characters
- ✅ Proper heading hierarchy (H1 → H6)

### 2.2 Prohibited Formats
- ❌ .docx, .pdf as source documents
- ❌ Images as primary information carriers
- ❌ Binary formats without plain text alternatives

### 2.3 Version Headers
All documents must include:
```markdown
**Version:** X.Y.Z
**Last Updated:** YYYY-MM-DD
**Owner:** [Role/Name]
**Status:** Draft | Review | Approved | Deprecated
```

## 3. DOCUMENTATION STRUCTURE

### 3.1 Folder Hierarchy
```
docs/
├── 00-master/          # SSOT and governance
├── 01-architecture/    # System design
├── 02-security/        # Security policies
├── 03-observability/   # Monitoring & logs
├── 04-product/         # Product documentation
├── 05-operations/      # Deployment & ops
├── 06-development/     # Dev processes
├── 07-roadmap/         # Planning
└── archive/            # Historical documents
```

### 3.2 Document Types
| Type | Location | Purpose |
|------|---------|---------|
| SSOT | 00-master/ | Ultimate authority |
| Standards | Appropriate domain folder | Implementation guidelines |
| Procedures | 05-operations/, 06-development/ | Step-by-step instructions |
| Reference | Appropriate domain folder | Technical reference |
| Historical | archive/ | Audit trail |

## 4. CHANGE CONTROL PROCESS

### 4.1 Change Types
| Change Type | Approval Required | Process |
|-------------|-----------------|--------|
| SSOT Update | PM + Tech Lead | Formal proposal, review, approval |
| Standards Update | Tech Lead + Domain Owner | Review, update, communicate |
| Procedure Update | Domain Owner | Review, update, test |
| Historical Archive | Documentation Lead | Move to archive, update references |

### 4.2 Change Request Template
```markdown
## CHANGE REQUEST
**Document:** [Document Name]
**Section:** [Section to Change]
**Current:** [Current Content]
**Proposed:** [Proposed Content]
**Rationale:** [Why this change is needed]
**Impact:** [What this affects]
**Reviewers:** [Names]
**Approval:** [ ] PM [ ] Tech Lead [ ] Domain Owner
```

## 5. MAINTENANCE & REVIEW

### 5.1 Review Cycles
| Document Type | Review Frequency | Responsible |
|---------------|----------------|-------------|
| SSOT | Monthly | PM + Tech Lead |
| Security Policies | Quarterly | Security Lead |
| Architecture | Quarterly | Tech Lead |
| Procedures | Biannually | Domain Owners |
| All Documents | Annually | Documentation Lead |

### 5.2 Archive Policy
- Documents older than 6 months without updates → Review for archive
- Superseded documents → Move to archive immediately
- Archive must preserve original content and metadata
- Archive README must explain archiving rationale

## 6. QUALITY STANDARDS

### 6.1 Required Elements
All documents must have:
- Clear title and purpose
- Table of contents (if >500 words)
- Version header
- Owner assignment
- Last updated date
- Reference to SSOT
- Clear target audience

### 6.2 Prohibited Content
- ❌ Personal opinions without evidence
- ❌ Contradictory information
- ❌ Unsubstantiated claims
- ❌ Temporary notes (use comments or issues)
- ❌ Sensitive information (secrets, credentials)

## 7. ENFORCEMENT

### 7.1 Compliance Checks
- CI/CD pipeline includes documentation validation
- PR reviews check for documentation updates
- Quarterly compliance audits
- Onboarding includes documentation standards training

### 7.2 Violation Handling
| Violation | Action |
|-----------|--------|
| Missing documentation for feature | Block PR until added |
| Contradicts SSOT | Immediate correction required |
| Wrong format | Request reformatting |
| Missing version header | Add header before approval |

## 8. OWNERSHIP & RESPONSIBILITIES

### 8.1 Roles
| Role | Documentation Responsibilities |
|------|-------------------------------|
| PM | SSOT authority, governance enforcement |
| Tech Lead | Technical accuracy, architecture docs |
| Security Lead | Security policies, compliance docs |
| Domain Owners | Procedure documents, reference docs |
| All Engineers | Code documentation, update requests |

### 8.2 Onboarding
New team members must:
- Read SSOT within first week
- Review documentation structure
- Complete documentation standards training
- Acknowledge governance policy

## 9. TOOLING & AUTOMATION

### 9.1 Required Tools
- Markdown linter in CI/CD
- Broken link checker
- Version consistency checker
- Archive automation scripts

### 9.2 Automation Rules
- PRs without documentation updates flagged
- Old documents automatically flagged for review
- Cross-references validated automatically
- Format standards enforced automatically

## APPROVAL
Policy Owner: Documentation Lead  
Effective Date: {{EFFECTIVE_DATE}}  
Next Review: {{NEXT_REVIEW_DATE}}  

Approved By:
- Project Owner/PM
- Technical Lead
- Security Lead