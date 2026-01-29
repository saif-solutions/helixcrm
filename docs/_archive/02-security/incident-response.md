# Incident Response Procedures

## Emergency Contact List

### Technical Team
| Role | Name | Contact | Backup |
|------|------|---------|--------|
| Security Lead | [Name] | [Phone] [Email] | [Backup Name] |
| DevOps Lead | [Name] | [Phone] [Email] | [Backup Name] |
| Database Admin | [Name] | [Phone] [Email] | [Backup Name] |

### Management Team
| Role | Name | Contact |
|------|------|---------|
| CTO | [Name] | [Phone] [Email] |
| Legal Counsel | [Name] | [Phone] [Email] |
| PR/Communications | [Name] | [Phone] [Email] |

## Incident Classification

### Severity Levels
| Level | Impact | Response Time | Example |
|-------|---------|---------------|---------|
| SEV-1 | Critical | 15 minutes | Active token compromise, Data breach |
| SEV-2 | High | 1 hour | CSRF exploitation, Rate limit bypass |
| SEV-3 | Medium | 4 hours | Security header misconfiguration |
| SEV-4 | Low | 24 hours | Informational security events |

## Response Procedures

### Token Compromise Incident

#### Detection Indicators
- Multiple "Refresh token reuse detected" logs from different IPs
- User reports unauthorized access
- Unusual geographic access patterns

#### Immediate Response (SEV-1)
```sql
-- 1. Invalidate all tokens for affected user
UPDATE users SET 
  refreshTokenHash = NULL,
  refreshTokenVersion = NULL,
  tokenVersion = tokenVersion + 1
WHERE id = :compromisedUserId;

-- 2. Log the incident
INSERT INTO security_incidents (type, userId, severity, details)
VALUES ('token_compromise', :userId, 'SEV-1', :incidentDetails);
```

**Communication Plan**

- 15 minutes: Security team notified
- 1 hour: Affected user notified via email
- 4 hours: Internal incident report
- 24 hours: Determine if regulatory reporting required

### Database Security Breach

**Detection Indicators**

- Unusual database query patterns
- Unexplained data exports
- Security monitoring alerts

**Immediate Response (SEV-1)**

- Isolate affected systems
- Rotate all credentials: database passwords, JWT secrets, API keys
- Force password reset for all users
- Enable enhanced logging

**Investigation Steps**

- Determine breach vector (SQLi, credential theft, etc.)
- Identify affected data scope
- Preserve forensic evidence
- Document timeline of events

### CSRF Exploitation

**Detection Indicators**

- Spike in 403 responses with CSRF errors
- User reports unauthorized actions
- Missing X-CSRF-Token headers in logs

**Response (SEV-2)**

```bash
grep "CSRF" /var/log/application.log | tail -50
```

- Check for XSS vulnerabilities that could enable CSRF
- Review CSP headers for bypass possibilities
- Temporary measures: reduce session timeout, add additional CSRF protections

### Credential Stuffing Attack

**Detection Indicators**

- High volume of failed login attempts (>100/hour)
- Login attempts with known breached passwords
- Multiple IPs trying same credentials

**Response (SEV-2)**

```typescript
// Temporary enhanced rate limiting
{
  ttl: 300000,    // 5 minutes
  limit: 3        // 3 attempts
}
```

```sql
UPDATE users SET 
  lockedUntil = NOW() + INTERVAL '1 hour',
  failedLoginAttempts = 0
WHERE email IN (:compromisedEmails);
```

- Notify affected users about the attack

### Log Review Procedures

**Daily Security Checks**

```bash
#!/bin/bash
# Daily security log review
LOGFILE="/var/log/security/$(date +%Y-%m-%d).log"

# 1. Failed authentication
grep -c "Failed login" $LOGFILE

# 2. Token reuse attempts
grep -c "token reuse detected" $LOGFILE

# 3. CSRF failures
grep -c "Invalid CSRF" $LOGFILE

# 4. Rate limit breaches
grep -c "Rate limit exceeded" $LOGFILE
```

**Weekly Deep Dive**

- User session analysis: Average duration, concurrent sessions
- Geographic patterns: Unusual country/region access
- API usage: Identify abnormal request patterns
- Security header compliance: Missing headers audit

### Communication Protocols

**Internal Communications**

- Slack: #security-incidents channel
- Email: security@company.com for alerts
- Phone: Emergency call tree activation

**External Communications**

- Users: Transparent but cautious disclosure
- Regulators: Required within 72 hours for data breaches
- Public: Coordinated through PR/Communications

**Communication Templates**

```markdown
SUBJECT: Security Incident Notification

Dear [User Name],

We detected suspicious activity on your account [timestamp].
As a precaution, we have:

1. Logged out all active sessions
2. Invalidated all access tokens
3. Reset your password (check email for reset link)

No sensitive data was accessed in this incident.

Please contact security@company.com with questions.

- Security Team
```

### Post-Incident Activities

**24-Hour Report**

- Timeline of events
- Initial impact assessment
- Immediate corrective actions
- Communication sent

**1-Week Analysis**

- Root cause determination
- Preventive measures identified
- Process improvements
- Team debrief

**2-Week Implementation**

- Security improvements deployed
- Monitoring enhancements
- Training updates
- Documentation revisions

### Training & Preparedness

**Quarterly Drills**

- Tabletop exercises: Simulate security incidents
- Communication drills: Test emergency contact protocols
- Tool validation: Ensure monitoring/alerting works

**Annual Training**

- Security awareness for all employees
- Incident response role training
- New tool/process training

### Legal & Compliance Considerations

**Reporting Requirements**

| Regulation | Timeframe | Authority |
|------------|-----------|----------|
| GDPR       | 72 hours  | Data Protection Authority |
| HIPAA      | 60 days   | Department of Health      |
| PCI DSS    | Immediately | Card brands             |

**Documentation Requirements**

- Incident log with timestamps
- Actions taken with justification
- Communication records
- Remediation evidence
