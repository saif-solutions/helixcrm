-- DROP and RECREATE audit_logs table with correct schema
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Create enums (if they don't exist)
DO $$ BEGIN
    CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "AuditSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "AuditAction" AS ENUM (
      'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'PASSWORD_CHANGE', 'TOKEN_REFRESH',
      'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'ROLE_CHANGED',
      'CONTACT_CREATED', 'CONTACT_UPDATED', 'CONTACT_DELETED',
      'DEAL_CREATED', 'DEAL_UPDATED', 'DEAL_DELETED',
      'PIPELINE_CREATED', 'PIPELINE_UPDATED', 'PIPELINE_DELETED',
      'LEAD_CREATED', 'LEAD_UPDATED', 'LEAD_DELETED',
      'PERMISSION_DENIED', 'CSRF_FAILURE', 'RATE_LIMIT_TRIGGERED', 'SYSTEM_ERROR'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "AuditEntityType" AS ENUM (
      'AUTH', 'USER', 'CONTACT', 'DEAL', 'PIPELINE', 'LEAD', 'ACCOUNT', 'ACTIVITY', 'SYSTEM'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create new table
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  action "AuditAction" NOT NULL,
  "entityType" "AuditEntityType" NOT NULL,
  "entityId" TEXT,
  "organizationId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorEmail" TEXT NOT NULL,
  "actorType" "ActorType" NOT NULL DEFAULT 'USER',
  "requestId" TEXT,
  "severity" "AuditSeverity" NOT NULL DEFAULT 'LOW',
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign keys
  FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY ("actorUserId") REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON audit_logs("organizationId", "createdAt" DESC);
CREATE INDEX "audit_logs_actorUserId_idx" ON audit_logs("actorUserId");
CREATE INDEX "audit_logs_requestId_idx" ON audit_logs("requestId");
CREATE INDEX "audit_logs_severity_idx" ON audit_logs("severity");
CREATE INDEX "audit_logs_actorType_createdAt_idx" ON audit_logs("actorType", "createdAt" DESC);
CREATE INDEX "audit_logs_action_idx" ON audit_logs("action");
CREATE INDEX "audit_logs_entityType_idx" ON audit_logs("entityType");
