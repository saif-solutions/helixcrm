-- apps/api/prisma/scripts/rls-enforcement.sql
-- ACTUAL RLS POLICIES THAT WILL BE EXECUTED ON EVERY DEPLOYMENT

-- Enable RLS on ALL tenant tables
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS tenant_isolation_policy ON "users";
DROP POLICY IF EXISTS tenant_isolation_policy ON "contacts";
DROP POLICY IF EXISTS tenant_isolation_policy ON "accounts";
DROP POLICY IF EXISTS tenant_isolation_policy ON "activities";
DROP POLICY IF EXISTS tenant_isolation_policy ON "audit_logs";

-- Users table: Users can only see users in their organization
CREATE POLICY tenant_isolation_policy ON "users"
    USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- Contacts table: Users can only see contacts in their organization  
CREATE POLICY tenant_isolation_policy ON "contacts"
    USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- Accounts table: Users can only see accounts in their organization
CREATE POLICY tenant_isolation_policy ON "accounts"
    USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- Activities table: Users can only see activities in their organization
CREATE POLICY tenant_isolation_policy ON "activities"
    USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- Audit logs: Users can only see audit logs in their organization
CREATE POLICY tenant_isolation_policy ON "audit_logs"
    USING (
        organization_id = current_setting('app.current_organization_id')::uuid 
        OR organization_id IS NULL
    );

-- Super admin bypass (for system operations)
-- This user can see everything (use with extreme caution)
CREATE POLICY super_admin_bypass ON "users"
    USING (current_setting('app.is_super_admin', true) = 'true');

-- Allow users to see their own user record regardless of policy
-- (Important for authentication)
CREATE POLICY user_self_access ON "users"
    USING (
        id = current_setting('app.current_user_id')::uuid
        OR organization_id = current_setting('app.current_organization_id')::uuid
    );