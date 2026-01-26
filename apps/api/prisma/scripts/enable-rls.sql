-- Enable Row Level Security on all tenant-owned tables
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pipelines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pipeline_stages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;  -- NEW
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;  -- NEW
ALTER TABLE "deal_stage_history" ENABLE ROW LEVEL SECURITY;  -- NEW

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "organizations_policy" ON "organizations";
DROP POLICY IF EXISTS "users_policy" ON "users";
DROP POLICY IF EXISTS "contacts_policy" ON "contacts";
DROP POLICY IF EXISTS "accounts_policy" ON "accounts";
DROP POLICY IF EXISTS "leads_policy" ON "leads";
DROP POLICY IF EXISTS "activities_policy" ON "activities";
DROP POLICY IF EXISTS "deals_policy" ON "deals";
DROP POLICY IF EXISTS "pipelines_policy" ON "pipelines";
DROP POLICY IF EXISTS "pipeline_stages_policy" ON "pipeline_stages";
DROP POLICY IF EXISTS "roles_policy" ON "roles";
DROP POLICY IF EXISTS "user_roles_policy" ON "user_roles";
DROP POLICY IF EXISTS "refresh_tokens_policy" ON "refresh_tokens";
DROP POLICY IF EXISTS "audit_logs_policy" ON "audit_logs";
DROP POLICY IF EXISTS "password_reset_tokens_policy" ON "password_reset_tokens";
DROP POLICY IF EXISTS "permissions_policy" ON "permissions";  -- NEW
DROP POLICY IF EXISTS "role_permissions_policy" ON "role_permissions";  -- NEW
DROP POLICY IF EXISTS "deal_stage_history_policy" ON "deal_stage_history";  -- NEW

-- Create policies for each table with CORRECT COLUMN NAMES (from Prisma schema)
-- Note: Your Prisma schema uses camelCase: "organizationId", "userId", etc.

-- Organizations: Users can only see their own organization
CREATE POLICY "organizations_policy" ON "organizations"
FOR ALL USING ((id::uuid) = current_setting('app.current_organization_id', true)::uuid);

-- Users: Can see users in their organization, except deleted ones
CREATE POLICY "users_policy" ON "users"
FOR ALL USING (
  ("organizationId"::uuid) = current_setting('app.current_organization_id', true)::uuid 
  AND "deletedAt" IS NULL
);

-- Contacts: Can see contacts in their organization, except deleted ones
CREATE POLICY "contacts_policy" ON "contacts"
FOR ALL USING (
  ("organizationId"::uuid) = current_setting('app.current_organization_id', true)::uuid 
  AND "deletedAt" IS NULL
);

-- Accounts: Can see accounts in their organization, except deleted ones
CREATE POLICY "accounts_policy" ON "accounts"
FOR ALL USING (
  ("organizationId"::uuid) = current_setting('app.current_organization_id', true)::uuid 
  AND "deletedAt" IS NULL
);

-- Leads: Can see leads in their organization, except deleted ones
CREATE POLICY "leads_policy" ON "leads"
FOR ALL USING (
  ("organizationId"::uuid) = current_setting('app.current_organization_id', true)::uuid 
  AND "deletedAt" IS NULL
);

-- Activities: Can see activities in their organization, except deleted ones
CREATE POLICY "activities_policy" ON "activities"
FOR ALL USING (
  ("organizationId"::uuid) = current_setting('app.current_organization_id', true)::uuid 
  AND "deletedAt" IS NULL
);

-- Deals: Can see deals in their organization, except deleted ones
CREATE POLICY "deals_policy" ON "deals"
FOR ALL USING (
  ("organizationId"::uuid) = current_setting('app.current_organization_id', true)::uuid 
  AND "deletedAt" IS NULL
);

-- Pipelines: Can see pipelines in their organization, except deleted ones
CREATE POLICY "pipelines_policy" ON "pipelines"
FOR ALL USING (
  ("organizationId"::uuid) = current_setting('app.current_organization_id', true)::uuid 
  AND "deletedAt" IS NULL
);

-- Pipeline Stages: Can see stages in their organization's pipelines, except deleted ones
CREATE POLICY "pipeline_stages_policy" ON "pipeline_stages"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "pipelines" p 
    WHERE p.id = "pipeline_stages"."pipelineId" 
    AND (p."organizationId"::uuid) = current_setting('app.current_organization_id', true)::uuid
    AND p."deletedAt" IS NULL
  )
  AND "deletedAt" IS NULL
);

-- Roles: Can see roles in their organization, except deleted ones
CREATE POLICY "roles_policy" ON "roles"
FOR ALL USING (
  ("organizationId"::uuid) = current_setting('app.current_organization_id', true)::uuid 
  AND "deletedAt" IS NULL
);

-- User Roles: Can see user roles in their organization, except deleted ones
CREATE POLICY "user_roles_policy" ON "user_roles"
FOR ALL USING (
  ("organizationId"::uuid) = current_setting('app.current_organization_id', true)::uuid 
  AND "deletedAt" IS NULL
);

-- Refresh Tokens: Can only see own organization's tokens
CREATE POLICY "refresh_tokens_policy" ON "refresh_tokens"
FOR ALL USING (("organizationId"::uuid) = current_setting('app.current_organization_id', true)::uuid);

-- Audit Logs: Can see audit logs for their organization
CREATE POLICY "audit_logs_policy" ON "audit_logs"
FOR ALL USING (("organizationId"::uuid) = current_setting('app.current_organization_id', true)::uuid);

-- Password Reset Tokens: Can only see own organization's tokens
CREATE POLICY "password_reset_tokens_policy" ON "password_reset_tokens"
FOR ALL USING (("organizationId"::uuid) = current_setting('app.current_organization_id', true)::uuid);

-- Permissions: Global table, but filter by module if needed (optional)
CREATE POLICY "permissions_policy" ON "permissions"
FOR ALL USING (true);  -- Permissions are global/shared

-- Role Permissions: Filter by organization through role
CREATE POLICY "role_permissions_policy" ON "role_permissions"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "roles" r 
    WHERE r.id = "role_permissions"."roleId" 
    AND (r."organizationId"::uuid) = current_setting('app.current_organization_id', true)::uuid
    AND r."deletedAt" IS NULL
  )
);

-- Deal Stage History: Filter by organization through deal
CREATE POLICY "deal_stage_history_policy" ON "deal_stage_history"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "deals" d 
    WHERE d.id = "deal_stage_history"."dealId" 
    AND (d."organizationId"::uuid) = current_setting('app.current_organization_id', true)::uuid
    AND d."deletedAt" IS NULL
  )
);

-- Create bypass policy for EACH TABLE for super_admin role
-- PostgreSQL doesn't support "ON ALL TABLES", so we create individually:
CREATE POLICY "organizations_bypass_policy" ON "organizations"
FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');

CREATE POLICY "users_bypass_policy" ON "users"
FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');

CREATE POLICY "contacts_bypass_policy" ON "contacts"
FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');

CREATE POLICY "accounts_bypass_policy" ON "accounts"
FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');

CREATE POLICY "leads_bypass_policy" ON "leads"
FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');

CREATE POLICY "activities_bypass_policy" ON "activities"
FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');

CREATE POLICY "deals_bypass_policy" ON "deals"
FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');

CREATE POLICY "pipelines_bypass_policy" ON "pipelines"
FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');

CREATE POLICY "pipeline_stages_bypass_policy" ON "pipeline_stages"
FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');

CREATE POLICY "roles_bypass_policy" ON "roles"
FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');

CREATE POLICY "user_roles_bypass_policy" ON "user_roles"
FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');

CREATE POLICY "refresh_tokens_bypass_policy" ON "refresh_tokens"
FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');

CREATE POLICY "audit_logs_bypass_policy" ON "audit_logs"
FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');

CREATE POLICY "password_reset_tokens_bypass_policy" ON "password_reset_tokens"
FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');

CREATE POLICY "permissions_bypass_policy" ON "permissions"
FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');

CREATE POLICY "role_permissions_bypass_policy" ON "role_permissions"
FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');

CREATE POLICY "deal_stage_history_bypass_policy" ON "deal_stage_history"
FOR ALL USING (current_setting('app.current_role', true) = 'super_admin');

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO postgres;