# ��� HELIX CRM MVP - OPERATIONS RUNBOOK

## ��� DEPLOYMENT PROCEDURE

### PRE-DEPLOYMENT CHECKLIST

```bash
# 1. Environment Verification
echo "NODE_ENV=$NODE_ENV"
echo "DATABASE_URL configured: $(if [ -n "$DATABASE_URL" ]; then echo '✅'; else echo '❌'; fi)"
echo "JWT_SECRET configured: $(if [ -n "$JWT_SECRET" ]; then echo '✅'; else echo '❌'; fi)"
echo "CORS_ORIGIN configured: $(if [ -n "$CORS_ORIGIN" ]; then echo '✅'; else echo '❌'; fi)"

# 2. Code Verification
git status --porcelain | wc -l | xargs test 0 -eq && echo "✅ No uncommitted changes" || echo "❌ Uncommitted changes detected"
git log --oneline -3
npm run test
npm run test:e2e
npm run lint
npm run build

# 3. Database Verification
npx prisma migrate status
npx prisma db execute --stdin << 'EOF'
SELECT COUNT(*) as rls_tables FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
DEPLOYMENT COMMANDS (PRODUCTION)
bash
# 1. Clean Environment
rm -rf dist node_modules/.cache

# 2. Install Dependencies (PRODUCTION ONLY)
npm ci --only=production

# 3. Build Application
NODE_ENV=production npm run build

# 4. Database Migrations
NODE_ENV=production npx prisma migrate deploy
NODE_ENV=production npx prisma generate

# 5. Start Application (PM2 RECOMMENDED)
pm2 start dist/src/main.js --name helixcrm-api \
  --instances max \
  --max-memory-restart 1G \
  --log-date-format "YYYY-MM-DD HH:mm:ss" \
  --output /var/log/helixcrm/api.out.log \
  --error /var/log/helixcrm/api.err.log \
  --time

# Alternative: Direct Node
NODE_ENV=production node dist/src/main.js
POST-DEPLOYMENT VALIDATION
bash
# 1. Health Check
curl -f https://api.yourdomain.com/health || echo "Health check failed"

# 2. Authentication Test
curl -X POST https://api.yourdomain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"initial-password"}' \
  -w "\\nHTTP Status: %{http_code}\\n"

# 3. Tenant Isolation Test
curl -X GET https://api.yourdomain.com/contacts \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: test-tenant" \
  -w "\\nHTTP Status: %{http_code}\\n"

# 4. Audit Log Verification
curl -X GET https://api.yourdomain.com/audit-logs \
  -H "Authorization: Bearer <token>" \
  -w "\\nHTTP Status: %{http_code}\\n"
🚨 INCIDENT RESPONSE PROCEDURES
DATABASE CONNECTION ISSUES
Symptoms: 503 errors, connection timeouts
Immediate Action:

Check database status: pg_isready -h database-host

Check connection pool: Review Prisma logs

Scale database connections if needed
Rollback: None needed (stateless API)

HIGH MEMORY USAGE
Symptoms: Process restarts, slow responses
Immediate Action:

Check memory: pm2 monit or top

Identify memory leak: Take heap snapshot

Restart with more memory: pm2 reload helixcrm-api --max-memory-restart 2G
Rollback: Deploy previous version if regression

SECURITY INCIDENT
Symptoms: Unusual audit logs, failed login spikes
Immediate Action:

Enable enhanced logging

Block suspicious IPs at firewall level

Rotate JWT secrets immediately

Notify security team
Rollback: Deploy security patch immediately

DATA CORRUPTION
Symptoms: Inconsistent data, foreign key violations
Immediate Action:

Stop writes if possible

Take database backup immediately

Analyze recent migrations

Engage database administrator
Rollback: Restore from last known good backup

📊 MONITORING & ALERTING
CRITICAL METRICS TO MONITOR
API Response Time: > 500ms P95 = Alert

Error Rate: > 1% 5xx errors = Alert

Database Connections: > 80% max = Alert

Memory Usage: > 80% for 5min = Alert

Audit Log Gap: Missing logs for > 1min = Alert

LOG AGGREGATION
json
// Structured Log Format (REQUIRED)
{
  "timestamp": "2024-02-09T21:00:00.000Z",
  "level": "error",
  "message": "Authentication failed",
  "correlationId": "req-12345",
  "userId": "user-123",
  "tenantId": "tenant-123",
  "endpoint": "/auth/login",
  "statusCode": 401
}
🔄 ROLLBACK PROCEDURE
EMERGENCY ROLLBACK (5 MINUTES)
bash
# 1. Stop current deployment
pm2 stop helixcrm-api

# 2. Checkout previous version
git checkout <previous-commit-hash>
npm ci --only=production
npm run build

# 3. Start previous version
pm2 start dist/src/main.js --name helixcrm-api-previous

# 4. Verify health
sleep 10
curl -f https://api.yourdomain.com/health || pm2 restart helixcrm-api-previous
GRACEFUL ROLLBACK (15 MINUTES)
Deploy previous version to canary environment

Route 10% traffic to canary

Monitor for 5 minutes

If stable, route 100% traffic

Delete failed deployment

📞 ESCALATION MATRIX
TIER 1 (DEVOPS TEAM)
API unavailable for < 5 minutes

Performance degradation

Minor security alerts
Contact: DevOps On-Call (24/7)

TIER 2 (SECURITY TEAM)
Data breach suspected

Authentication system compromised

Audit log tampering
Contact: Security Lead + CTO

TIER 3 (EXECUTIVE)
Customer data exposed

System-wide outage > 30 minutes

Compliance violation
Contact: CTO + CEO

🗓️ MAINTENANCE WINDOWS
Weekly: Sunday 02:00-04:00 UTC

Monthly: First Sunday of month

Emergency: Anytime with executive approval

LAST UPDATED: $(date +"%Y-%m-%d")
NEXT REVIEW: $(date -d "+30 days" +"%Y-%m-%d")
OWNER: DevOps Team
```
