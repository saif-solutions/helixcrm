-- Disable Row Level Security for maintenance and clean up all policies

-- First, drop all existing policies
DO $$ 
BEGIN
    -- Drop policies from each table
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
    DROP POLICY IF EXISTS "permissions_policy" ON "permissions";
    DROP POLICY IF EXISTS "role_permissions_policy" ON "role_permissions";
    DROP POLICY IF EXISTS "deal_stage_history_policy" ON "deal_stage_history";
    
    -- Drop bypass policies for each table
    DROP POLICY IF EXISTS "organizations_bypass_policy" ON "organizations";
    DROP POLICY IF EXISTS "users_bypass_policy" ON "users";
    DROP POLICY IF EXISTS "contacts_bypass_policy" ON "contacts";
    DROP POLICY IF EXISTS "accounts_bypass_policy" ON "accounts";
    DROP POLICY IF EXISTS "leads_bypass_policy" ON "leads";
    DROP POLICY IF EXISTS "activities_bypass_policy" ON "activities";
    DROP POLICY IF EXISTS "deals_bypass_policy" ON "deals";
    DROP POLICY IF EXISTS "pipelines_bypass_policy" ON "pipelines";
    DROP POLICY IF EXISTS "pipeline_stages_bypass_policy" ON "pipeline_stages";
    DROP POLICY IF EXISTS "roles_bypass_policy" ON "roles";
    DROP POLICY IF EXISTS "user_roles_bypass_policy" ON "user_roles";
    DROP POLICY IF EXISTS "refresh_tokens_bypass_policy" ON "refresh_tokens";
    DROP POLICY IF EXISTS "audit_logs_bypass_policy" ON "audit_logs";
    DROP POLICY IF EXISTS "password_reset_tokens_bypass_policy" ON "password_reset_tokens";
    DROP POLICY IF EXISTS "permissions_bypass_policy" ON "permissions";
    DROP POLICY IF EXISTS "role_permissions_bypass_policy" ON "role_permissions";
    DROP POLICY IF EXISTS "deal_stage_history_bypass_policy" ON "deal_stage_history";
    
    -- Also drop any other policies that might have been created
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s_access_policy" ON %I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "%s_bypass_policy" ON %I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "super_admin_bypass_policy" ON %I', table_name);
    END LOOP;
    
    RAISE NOTICE 'All RLS policies dropped successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

-- Now disable RLS on all tables
ALTER TABLE "organizations" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "contacts" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "leads" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "activities" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "deals" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "pipelines" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "pipeline_stages" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "user_roles" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "permissions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "role_permissions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "deal_stage_history" DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
DO $$ 
DECLARE
    rls_enabled_count INTEGER;
    total_tables_count INTEGER;
BEGIN
    -- Count tables that should have RLS
    SELECT COUNT(*) INTO total_tables_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
        'organizations', 'users', 'contacts', 'accounts', 'leads', 
        'activities', 'deals', 'pipelines', 'pipeline_stages', 
        'roles', 'user_roles', 'refresh_tokens', 'audit_logs', 
        'password_reset_tokens', 'permissions', 'role_permissions', 
        'deal_stage_history'
    );
    
    -- Count tables with RLS still enabled
    SELECT COUNT(*) INTO rls_enabled_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
        'organizations', 'users', 'contacts', 'accounts', 'leads', 
        'activities', 'deals', 'pipelines', 'pipeline_stages', 
        'roles', 'user_roles', 'refresh_tokens', 'audit_logs', 
        'password_reset_tokens', 'permissions', 'role_permissions', 
        'deal_stage_history'
    )
    AND rowsecurity = true;
    
    IF rls_enabled_count = 0 THEN
        RAISE NOTICE 'RLS successfully disabled on all % tables', total_tables_count;
    ELSE
        RAISE WARNING 'RLS still enabled on % of % tables', rls_enabled_count, total_tables_count;
        
        -- List which tables still have RLS enabled
        RAISE NOTICE 'Tables with RLS still enabled:';
        FOR rls_table IN 
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN (
                'organizations', 'users', 'contacts', 'accounts', 'leads', 
                'activities', 'deals', 'pipelines', 'pipeline_stages', 
                'roles', 'user_roles', 'refresh_tokens', 'audit_logs', 
                'password_reset_tokens', 'permissions', 'role_permissions', 
                'deal_stage_history'
            )
            AND rowsecurity = true
            ORDER BY tablename
        LOOP
            RAISE NOTICE '  - %', rls_table.tablename;
        END LOOP;
    END IF;
END $$;

-- Clean up any remaining configuration settings (optional)
DO $$ 
BEGIN
    -- Reset any application settings that might have been set
    PERFORM set_config('app.current_organization_id', '', true);
    PERFORM set_config('app.current_user_id', '', true);
    PERFORM set_config('app.current_role', '', true);
    
    RAISE NOTICE 'Application context settings cleared';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error clearing context settings: %', SQLERRM;
END $$;

-- Final status message
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS Maintenance Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All RLS policies have been dropped.';
    RAISE NOTICE 'RLS has been disabled on all tables.';
    RAISE NOTICE 'Database is now in maintenance mode.';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  WARNING: Multi-tenant isolation is OFF';
    RAISE NOTICE '   All users can see all organization data.';
    RAISE NOTICE '   Use only for maintenance operations.';
    RAISE NOTICE '========================================';
END $$;