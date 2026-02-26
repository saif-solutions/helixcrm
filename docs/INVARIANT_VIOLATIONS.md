# HELIXCRM Invariant Violation Playbook

> **Authority Level:** Controlled (Level 1B)
> **Purpose:** Define the process for detecting, classifying, responding to, and resolving invariant violations.
> **Scope:** All P0-P3 invariants defined in `INVARIANTS.md`

## 1. Violation Classification Framework

### 1.1 Severity Levels (from INVARIANTS.md)

| Severity | Impact | Examples | Response SLA |
|----------|--------|----------|--------------|
| **P0** | Catastrophic / Legal / Data Integrity | Cross-tenant data leak, Secret exposure | Immediate (within 1 hour) |
| **P1** | Security / Isolation / Auth Compromise | Token revocation failure, Missing audit logs | Urgent (within 24 hours) |
| **P2** | Architectural Integrity / Drift Risk | Domain layer framework import, Module boundary violation | Scheduled (next sprint) |
| **P3** | Operational / Performance / Process | Build non-reproducibility, Archive mutation | Backlog |

### 1.2 Detection Sources

Violations can be detected through:
- **Automated:** CI pipeline, runtime validation, monitoring alerts
- **Manual:** Code review, security audit, incident investigation
- **External:** Customer report, penetration test, compliance audit

## 2. Violation Response Workflow

### 2.1 Discovery Phase

When a violation is detected:

```mermaid
graph TD
    A[Violation Detected] --> B{Determine Severity}
    B -->|P0/P1| C[Immediate Triage]
    B -->|P2| D[Schedule Review]
    B -->|P3| E[Log for Backlog]
    
    C --> F[Create Violation Record]
    D --> F
    E --> G[Track in Issue Tracker]
    
    F --> H[Impact Assessment]
    H --> I[Remediation Planning]

    2.2 Required Information for Violation Record
Each violation MUST be documented with:

yaml
violation_id: V-YYYY-MM-DD-XXX  # Auto-generated
detected_at: 2026-02-14T15:30:00Z
detected_by: "system|person-name"
detection_source: "CI-pipeline|code-review|audit|incident"
severity: "P0|P1|P2|P3"
invariant_id: "T-01|S-02|etc"
description: "Clear description of what was violated"
impact_assessment: "Business/technical impact"
affected_components: ["auth-core", "api", etc]
root_cause: "Preliminary or final"
status: "investigating|remediating|resolved|waived"
3. Remediation Procedures by Severity
3.1 P0 Response Protocol (Critical)
Immediate Actions (First Hour):

Stop the line: Freeze all deployments

Assess impact: Determine data/security exposure

Contain: Implement immediate mitigation (may be temporary)

Notify: Alert security lead, architecture lead, product owner

Document: Create violation record with all known facts

Remediation (Next 24 Hours):

Root cause analysis: Full investigation

Permanent fix: Deploy with enhanced verification

Data remediation: Clean up any corrupted data

Post-mortem: Document lessons learned

Verification: Prove invariant is restored

Example P0 Response:

bash
# Immediate containment (example)
kubectl scale deployment api --replicas=0  # Stop traffic
./scripts/audit-data-integrity.sh --severity=P0  # Assess damage
git revert HEAD --no-commit  # Rollback changes
3.2 P1 Response Protocol (Security/Isolation)
First 24 Hours:

Triage: Determine if active exploitation possible

Patch: Deploy fix with priority

Audit: Review logs for potential exploitation

Document: Full violation record

Within 1 Week:

Enhance detection: Add monitoring/prevention

Review similar patterns: Check for related issues

Update tests: Ensure coverage

3.3 P2 Response Protocol (Architectural)
Next Sprint:

Schedule: Add to sprint planning

Design: Determine fix approach

Implement: With appropriate review

Verify: Update static analysis/tests

3.4 P3 Response Protocol (Operational)
Backlog Management:

Log: Create issue with priority label

Track: Review during backlog grooming

Batch: Fix in groups when efficient

4. Temporary Exceptions (Waivers)
4.1 When Waivers Are Allowed
Temporary waivers may be granted ONLY when:

Immediate fix impossible (requires major refactor)

Business critical deadline (documented exception)

Low-risk, time-bounded (must expire)

4.2 Waiver Requirements
Every waiver MUST include:

yaml
waiver_id: W-YYYY-MM-DD-XXX
invariant_id: "T-02"
expiration_date: 2026-03-01
granted_by: "Architecture Lead Name"
risk_assessment: "Low risk because..."
mitigation: "Manual review required for all X operations"
approval_chain: ["Tech Lead", "Security Lead"]
conditions: 
  - "Must be reviewed weekly"
  - "Automated alert if violation count exceeds 5"
4.3 Waiver Expiration
Expired waivers automatically become P1 violations

System MUST alert 1 week before expiration

Renewal requires fresh assessment

5. Verification & Closure
5.1 Closure Criteria
A violation is considered RESOLVED when:

Fix deployed: Remediation in production

Verification passed: Tests prove invariant restored

Documentation updated: Any lessons learned captured

Monitoring confirmed: Detection still works

5.2 Verification Requirements by Severity
Severity	Verification Required
P0	Independent security review + automated tests
P1	Full regression suite + security scan
P2	CI pipeline passing + code review
P3	Automated check passing
6. Continuous Improvement
6.1 Violation Review Board
Monthly review of:

All P0/P1 violations from previous month

Waiver expiration tracking

Pattern analysis for prevention

6.2 Prevention Investment
Allocate 20% of remediation effort to:

Improving detection (static analysis)

Strengthening enforcement (additional checks)

Developer education (updated guidelines)

7. Communication Templates
7.1 P0/P1 Initial Alert
text
Subject: [URGENT] P0 Invariant Violation Detected - [Brief Description]

Severity: P0
Invariant: T-01 (Cross-Tenant Data Impossibility)
Detected: 2026-02-14T15:30:00Z
Impact: [Brief impact assessment]
Action: All deployments frozen. Team responding.

Next update: Within 2 hours
7.2 Resolution Announcement
text
Subject: [RESOLVED] P0 Invariant Violation - [Brief Description]

Root Cause: [Summary]
Fix: [Description of remediation]
Verification: [How we proved it's fixed]
Prevention: [How we'll prevent recurrence]

Closure Time: 2026-02-15T10:30:00Z
Total Duration: 19 hours
8. Appendices
A. Quick Reference Card
text
VIOLATION DETECTED → STOP → CLASSIFY → RESPOND

P0: Freeze deploys, immediate fix
P1: Priority fix, security review
P2: Schedule next sprint
P3: Log and track

WAIVER: Only if impossible to fix + expires
B. Escalation Contacts
Role	Contact	P0/P1 Availability
Security Lead	[Contact]	24/7
Architecture Lead	[Contact]	Business hours
Product Owner	[Contact]	Business hours
C. Tooling Support
CI automatically blocks on P0/P1 violations

Dashboard shows active waivers

Weekly report of all violations

Last Updated: 2026-02-14
Next Review: 2026-03-14
Owner: Architecture Team