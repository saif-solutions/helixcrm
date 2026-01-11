# Deployment Security Checklist

## Pre-Deployment Verification

### Environment Configuration
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` set (32+ character random string)
- [ ] `DATABASE_URL` includes SSL parameters
- [ ] `COOKIE_DOMAIN=.yourdomain.com` (production)
- [ ] `CORS_ORIGIN` restricted to frontend domains
- [ ] `REDIS_URL` with password authentication

### Security Configuration Review
- [ ] `SecurityConfig.isProduction = true`
- [ ] Cookie flags: `secure: true`, `sameSite: 'strict'`
- [ ] HSTS enabled: `max-age=63072000; includeSubDomains; preload`
- [ ] CSP headers properly configured
- [ ] Rate limiting thresholds set appropriately

### Code Security Scan
- [ ] No hardcoded secrets in source code
- [ ] Input validation on all API endpoints
- [ ] Output encoding for XSS prevention
- [ ] SQL injection prevention verified
- [ ] Dependency vulnerability scan completed

## Infrastructure Security

### Network Configuration
- [ ] TLS/SSL certificates valid and installed
- [ ] Firewall rules restrict to necessary ports only
- [ ] VPC/network segmentation implemented
- [ ] DDoS protection enabled (Cloudflare/AWS Shield)
- [ ] WAF rules configured for application layer protection

### Database Security
- [ ] Encryption at rest enabled
- [ ] SSL/TLS for connections enforced
- [ ] Automated encrypted backups configured
- [ ] Access restricted by IP address
- [ ] Database user with least privilege principle
- [ ] Connection pooling with limits

### Redis/Session Store
- [ ] Password authentication enabled
- [ ] Network isolation (private subnet/VPC)
- [ ] SSL/TLS for connections
- [ ] Memory eviction policies configured
- [ ] Regular backup schedule

## Application Security Verification

### HTTP Headers Test
```bash
# Run this verification script
curl -I https://api.yourdomain.com/health

# Expected headers:
# ✅ X-Request-ID: present
# ✅ Content-Security-Policy: present and restrictive
# ✅ X-Content-Type-Options: nosniff
# ✅ X-Frame-Options: DENY or SAMEORIGIN
# ✅ Strict-Transport-Security: max-age=63072000; includeSubDomains
# ✅ Referrer-Policy: strict-origin-when-cross-origin
```

### Authentication Flow Tests
- Login with valid credentials succeeds
- Login with invalid credentials fails (no information leakage)
- Token rotation works (refresh endpoint)
- Old tokens properly rejected
- Logout invalidates all sessions
- Concurrent session limit enforced

### CSRF Protection Verification
- CSRF token endpoint accessible
- Non-GET requests without CSRF token rejected (403)
- Valid CSRF token with proper session accepted
- CSRF tokens unique per session
- CSRF cookie HttpOnly and Secure

### API Security Tests
- All endpoints require authentication (except explicitly public)
- CORS headers properly set for frontend domains only
- Request size limits enforced
- Query depth/complexity limits
- Rate limiting on authentication endpoints

### Monitoring & Alerting Setup

#### Logging Configuration
- Structured logging enabled (JSON format)
- Request ID propagation throughout system
- Security events logged with appropriate context
- Log aggregation to centralized system
- Log retention policy: 90+ days

#### Alert Configuration
- Failed login attempts (>10/minute) trigger alerts
- CSRF validation failures trigger alerts
- Token reuse detection triggers SEV-1 alert
- Rate limit breaches trigger alerts
- 5xx error rate >1% triggers alerts

#### Monitoring Dashboard
- Real-time security event dashboard
- Authentication success/failure rates
- API endpoint usage patterns
- System performance metrics
- Database connection health

## Post-Deployment Verification

### Penetration Testing
- Authentication bypass attempts tested
- SQL injection attempts tested
- XSS vulnerability tests completed
- CSRF protection validated
- API security testing completed

### User Acceptance Testing
- Password reset flow works end-to-end
- Account lockout mechanism functions
- Session timeout works correctly
- Concurrent session control tested
- Multi-factor authentication (if implemented)

### Documentation Verification
- Security architecture document updated
- Incident response procedures reviewed
- Deployment checklist updated with lessons learned
- Contact information for security issues published
- Compliance documentation current

## Regular Maintenance Schedule

### Daily Tasks
- Review security event logs
- Check for failed authentication spikes
- Verify backup completion
- Monitor certificate expiration (if <30 days)

### Weekly Tasks
- Dependency vulnerability scan
- Security patch review and application
- Access log analysis for anomalies
- Review rate limiting effectiveness

### Monthly Tasks
- Secret rotation (JWT, API keys, database passwords)
- Security audit log review
- Access control review
- Compliance checklist review

### Quarterly Tasks
- Full security audit
- Penetration testing engagement
- Disaster recovery drill
- Security policy review and update

## Emergency Rollback Procedures

### Conditions for Rollback
- Security vulnerability discovered
- Authentication system failure
- Data corruption risk
- Severe performance degradation

### Rollback Steps
- Immediate: Disable affected service/endpoint
- 30 minutes: Deploy previous known-good version
- 1 hour: Notify stakeholders of incident
- 4 hours: Post-mortem analysis begins
- 24 hours: Remediated version ready for deployment

## Compliance Documentation

### Required Documentation
- Data flow diagrams
- Security control matrix
- Incident response records
- Third-party security assessments
- Employee security training records

### Regulatory Compliance
| Regulation | Timeframe | Authority |
|------------|-----------|----------|
| GDPR       | 72 hours  | Data Protection Authority |
| HIPAA      | 60 days   | Department of Health      |
| PCI DSS    | If processing payments | Card brands |
| SOC 2      | Control descriptions and testing | N/A |

## Success Criteria

### Deployment Sign-off
- All checklist items completed
- Security team approval obtained
- Performance benchmarks met
- Monitoring confirmed operational
- Rollback plan documented and tested

### Post-Deployment Monitoring Period (7 days)
- No security incidents reported
- Performance within acceptable ranges
- User authentication flows working
- Automated alerts functioning correctly
- Logging and monitoring operational
