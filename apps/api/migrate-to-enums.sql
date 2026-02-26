-- migrate-audit-enums.sql
-- SAFE ENUM MIGRATION FOR AUDIT_LOGS TABLE

BEGIN;

-- 1. Backup current data
CREATE TEMP TABLE audit_logs_backup AS 
SELECT * FROM audit_logs;

-- 2. Drop foreign key constraints temporarily
ALTER TABLE audit_logs 
DROP CONSTRAINT IF EXISTS audit_logs_organizationId_fkey,
DROP CONSTRAINT IF EXISTS audit_logs_actorUserId_fkey;

-- 3. Convert text columns to uppercase for enum compatibility
UPDATE audit_logs 
SET 
  action = UPPER(action),
  "entityType" = UPPER("entityType"),
  "actorType" = UPPER("actorType"),
  severity = UPPER(severity);

-- 4. Set defaults for any invalid/null values
UPDATE audit_logs 
SET 
  action = 'SYSTEM_ERROR'
WHERE action NOT IN (
  'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'PASSWORD_CHANGE', 'TOKEN_REFRESH',
  'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'ROLE_CHANGED',
  'CONTACT_CREATED', 'CONTACT_UPDATED', 'CONTACT_DELETED',
  'DEAL_CREATED', 'DEAL_UPDATED', 'DEAL_DELETED',
  'PIPELINE_CREATED', 'PIPELINE_UPDATED', 'PIPELINE_DELETED',
  'LEAD_CREATED', 'LEAD_UPDATED', 'LEAD_DELETED',
  'PERMISSION_DENIED', 'CSRF_FAILURE', 'RATE_LIMIT_TRIGGERED', 'SYSTEM_ERROR'
) OR action IS NULL;

UPDATE audit_logs 
SET 
  "entityType" = 'SYSTEM'
WHERE "entityType" NOT IN (
  'AUTH', 'USER', 'CONTACT', 'DEAL', 'PIPELINE', 'LEAD', 'ACCOUNT', 'ACTIVITY', 'SYSTEM'
) OR "entityType" IS NULL;

UPDATE audit_logs 
SET 
  "actorType" = 'USER'
WHERE "actorType" NOT IN ('USER', 'SYSTEM') OR "actorType" IS NULL;

UPDATE audit_logs 
SET 
  severity = 'LOW'
WHERE severity NOT IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') OR severity IS NULL;

-- 5. Alter columns to use enum types with explicit casting
ALTER TABLE audit_logs 
  ALTER COLUMN action TYPE "AuditAction" 
  USING action::"AuditAction",
  
  ALTER COLUMN "entityType" TYPE "AuditEntityType" 
  USING "entityType"::"AuditEntityType",
  
  ALTER COLUMN "actorType" TYPE "ActorType" 
  USING "actorType"::"ActorType",
  
  ALTER COLUMN severity TYPE "AuditSeverity" 
  USING severity::"AuditSeverity";

-- 6. Restore foreign key constraints
ALTER TABLE audit_logs 
ADD CONSTRAINT audit_logs_organizationId_fkey 
FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE,

ADD CONSTRAINT audit_logs_actorUserId_fkey 
FOREIGN KEY ("actorUserId") REFERENCES users(id) ON DELETE SET NULL;

-- 7. Make columns NOT NULL
ALTER TABLE audit_logs 
  ALTER COLUMN action SET NOT NULL,
  ALTER COLUMN "entityType" SET NOT NULL,
  ALTER COLUMN "actorType" SET NOT NULL,
  ALTER COLUMN severity SET NOT NULL;

COMMIT;

-- Verify migration
SELECT 
  'action' as column_name, COUNT(DISTINCT action) as distinct_values
FROM audit_logs
UNION ALL
SELECT 
  'entityType', COUNT(DISTINCT "entityType")
FROM audit_logs
UNION ALL
SELECT 
  'actorType', COUNT(DISTINCT "actorType")
FROM audit_logs
UNION ALL
SELECT 
  'severity', COUNT(DISTINCT severity)
FROM audit_logs;