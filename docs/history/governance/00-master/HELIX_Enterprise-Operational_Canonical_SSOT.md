# HELIX ENTERPRISE PLATFORM — ENHANCED SINGLE SOURCE OF TRUTH (SSOT) v4.0

**Document Status:** Canonical & Binding  
**Audience:** Product, Engineering, Security, PM, AI Systems  
**Change Control:** PM + Tech Lead Approval Required  
**Last Updated:** January 2026  
**Governance:** Part II (Constitution) overrides Part I (Product Truth) in all conflicts

---

## PART I — PRODUCT & EXECUTIVE TRUTH

### 1. Product Vision

HELIX is an enterprise-grade, multi-tenant business platform designed to evolve from MVP to full enterprise without re-architecture. It delivers:

- Secure identity & access management (**HELIX AUTH**)
- Core CRM capabilities (**HELIX CRM**)
- Full auditability & operational visibility

**Priorities:**

| Priority | Principle |
|----------|-----------|
| Product  | Working product > architectural completeness |
| Security | Security correctness > feature velocity |
| UX       | UX clarity > feature density |

**Key Vision Enhancements:**

- Enterprise-ready authentication with audit logging and token invalidation
- Multi-tenancy enforced at all layers
- UX and accessibility standards for MVP and enterprise use
- Scalable architecture and observability from day one

### 2. Platform Composition

| System      | Description |
|------------|------------|
| HELIX AUTH | Standalone authentication & authorization platform; reusable across products |
| HELIX CRM  | Multi-tenant CRM that consumes HELIX AUTH; core business features |

### 3. Current MVP Capabilities (Verified)

| Area             | Status | Details |
|-----------------|--------|---------|
| Authentication   | ✅     | JWT, token invalidation, password reset |
| Tenant Isolation | ✅     | Application-layer enforced |
| Contacts CRUD    | ✅     | Fully functional |
| Logging          | ⚠️     | Structured logs present, centralized UI pending |
| RBAC             | ❌     | Roles defined but not implemented |
| UI/UX Polish     | ❌     | Functional but lacks design system |

### 4. Locked Product Decisions

- Auth is platform-independent
- Multi-tenancy enforced at all layers
- Logs are a product feature
- UX feedback required for all user actions

### 5. Enhanced MVP Timeline & Scope

| Timeline | Scope |
|----------|-------|
| Original | 6.5 weeks |
| Enhanced | 6.75 weeks (+3% for critical hardening) |

**Key Additions (Phase 0–6):**

- Professional error handling
- Basic compliance framework
- Documented scalability path

**Deferred to Phase 2+:**

- Metadata engine
- Global audit interceptor
- Complex feature flags

---

## PART II — PLATFORM CONSTITUTION (NON-NEGOTIABLE)

### 6. System Identity

All engineers and architects must:

- Enforce security invariants
- Respect tenant boundaries
- Avoid architectural hallucinations
- Prefer correctness over speed

### 7. Authentication Rules

- Auth must be reusable and independent of CRM
- Auth must log all security events
- Token invalidation must be supported
- Secrets must never appear in logs
- JWT in localStorage is a known risk → mitigate with secure storage

### 8. Multi-Tenancy Invariants

- Every request must resolve an organizationId
- Cross-tenant access is a critical violation
- Missing tenant context → request fails

### 9. Error Handling Standard

```ts
interface ErrorResponse {
  code: string;          // e.g., "VALIDATION_ERROR"
  message: string;       // User-friendly
  details?: any;         // Dev-only
  timestamp: string;
  requestId: string;
}
```

- Never expose stack traces to users  
- Log all errors with correlation IDs

### 10. Performance Baselines

| Operation               | Target (p95) | Measurement Method |
|------------------------|--------------|------------------|
| API Response Time       | < 200ms      | New Relic / Prometheus |
| Dashboard Load          | < 3s         | Browser performance API |
| CSV Import (1000 rows)  | < 30s        | Internal timing |
| Authentication          | < 500ms      | End-to-end timing |
| Database Queries        | < 50ms       | PostgreSQL EXPLAIN ANALYZE |

### 11. UI/UX Minimum Standards

- Desktop-first; mobile-responsive optional for MVP
- Consistent spacing (8px base unit)
- Semantic HTML & keyboard navigation
- Color contrast ≥ 4.5:1
- Design tokens for spacing, color, typography
- Empty state, error state, and accessibility handling

### 12. Audit Logging (MVP Schema)

```prisma
model AuditLog {
  id        String   @id @default(uuid())
  tenantId  String
  action    String   // CREATE, UPDATE, DELETE, LOGIN, LOGOUT
  entity    String   // Contact, Account, User
  entityId  String
  userId    String?
  changes   Json?    // {before: {...}, after: {...}}
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
}
```

- Log critical actions only (no GET requests)  
- Anonymize sensitive data  
- 90-day retention, compressed after 30 days

### 13. Security & Incident Response

**Immediate Response Procedure:**

1. ISOLATE affected system  
2. ASSESS scope (tenant, data, timeline)  
3. CONTAIN via secret rotation  
4. ANALYZE audit logs  
5. NOTIFY tenants within 48 hours  
6. REMEDIATE & restore  
7. DOCUMENT lessons learned

### 14. Data Retention & Backup

| Data Type      | Retention | Notes |
|----------------|----------|-------|
| User Data       | Indefinite | Core business data |
| Audit Logs      | 90 days   | Compressed after 30 days |
| Backup Files    | 14 days   | Daily snapshots |
| Temporary Files | 7 days    | Cache, uploads |

- **RPO:** 24 hours  
- **RTO:** 4 hours

### 15. Horizontal Scalability Triggers

| Metric             | Threshold         | Action |
|-------------------|-----------------|--------|
| Database CPU       | >70% sustained  | Add read replicas |
| API Response Time  | >500ms p95      | Add API instances |
| Tenant Count       | >100 active     | Consider microservices |
| Event Volume       | >10k events/day | Message queue (RabbitMQ) |
| Storage            | >100GB          | Object storage (S3) |

---

## PART III — ENTERPRISE HARDENING EXECUTION PLAN

### Phase 0: Governance & Freeze (Mandatory)

- ❌ No new features  
- ✅ Only refactor, cleanup, hardening  
- Tag: `v0.9.0-pre-enterprise`  
- This SSOT is the single source of truth

### Phase 1: Cleanup & Structural Sanity

- Remove duplicate auth guards, mock APIs, dead controllers  
- Normalize DTO validation, error handling, config loading  
- Enforce single API service layer, one auth hook

### Phase 2: Security Hardening

- Enforce tenant isolation  
- Global validation pipes & rate limiting  
- Security headers (Helmet), strict CORS  
- Environment validation at boot

### Phase 3: Logging, Audit & Observability

- Structured JSON logs with request ID propagation  
- Immutable audit store  
- Metrics: latency, error rate, auth failures  
- Health endpoints: `/health`, `/ready`

### Phase 4: UX Elevation

- Design tokens (spacing, color, typography)  
- Consistent layouts, empty states, error messages  
- Accessibility pass (ARIA, contrast)

### Phase 5: Platformization

- Auth as standalone deployable service  
- Clean public APIs, versioned contracts  
- Webhook/event capabilities

### Phase 6: Enterprise Readiness Certification

- Security, UX, Ops sign-off  
- Final tag: `v1.0.0-enterprise`  
- Pilot readiness checklist complete

---

## PART IV — QUALITY & GOVERNANCE

### CI/CD Quality Gates

```yaml
# .github/workflows/quality.yml
- Check RLS policies
- Dependency vulnerability scan
- Performance budget check
- Tenant isolation verification
```

### Code Review Checklist (Mandatory)

- Tenant isolation maintained  
- Error handling follows standards  
- No sensitive data in logs  
- Performance impact considered  
- Security implications reviewed

### Risk Register

| Risk                  | Probability | Impact   | Mitigation |
|----------------------|------------|---------|-----------|
| Performance Degradation | Medium    | High    | Baselines defined; monitoring alerts |
| Security Incident      | Low       | Critical | Incident response plan; regular reviews |
| Data Loss             | Low       | Critical | Daily backups; restore testing |
| Scope Creep           | High      | High    | Phase boundaries enforced |
| Team Burnout          | Medium    | Medium  | Realistic timeline; clear priorities |

### Success Metrics (MVP Launch)

**Technical:**

- System Uptime > 99.5%  
- Error Rate < 1%  
- Response Time < 200ms (p95)  
- Test Coverage > 80%

**Business:**

- Active Tenants > 3  
- User Satisfaction > 4/5  
- 100% Tenant Isolation Verified

---

## PART V — TRACEABILITY & CONTROL

### Change Management

- Semantic versioning enforced  
- Decision log required for breaking changes  
- PM approval required for scope changes

### Contact Points During Development

| Concern             | Contact               | Response Time |
|--------------------|---------------------|---------------|
| Technical Blockers  | Tech Lead (Slack)    | < 2 hours     |
| Scope/Requirements  | Product Owner        | < 4 hours     |
| Security Issues     | Security Channel     | < 1 hour      |
| Infrastructure      | DevOps Engineer      | < 4 hours     |

### Immediate Next Actions

- Initialize repository with enhanced structure  
- Create documentation folders with new policies  
- Set up CI/CD with quality gates  
- Begin error handling foundation  
- Schedule security review for end of Phase 0

---

## SIGN-OFF & ACKNOWLEDGMENT

By signing below, we acknowledge understanding and agreement with:

- ✅ The 6.75-week enhanced timeline to MVP  
- ✅ The error handling and performance standards  
- ✅ The security and compliance framework  
- ✅ The deferred architectural decisions (Phase 2+)  
- ✅ The future version scope boundaries  
- ✅ The incident response and backup procedures

**Signatures:**

- Product Owner: ________________________ Date: ________  
- Tech Lead: ____________________________ Date: ________  
- Development Team: _____________________ Date: ________

**Document Status:** ✅ LOCKED FOR DEVELOPMENT  
**Version:** 4.0 (Enhanced Enterprise SSOT)  
**Effective Date:** Upon signature  
**Next Review:** After Phase 0 completion (Week 2.5)
