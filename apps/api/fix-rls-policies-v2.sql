-- fix-rls-policies-v2.sql
-- Drop and recreate all RLS policies safely

DO $$ 
DECLARE 
    tbl_name text;
    has_org_id boolean;
BEGIN
    FOR tbl_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%' 
        AND tablename NOT LIKE '_prisma%'
        ORDER BY tablename
    LOOP
        -- Drop existing policies
        EXECUTE format('DROP POLICY IF EXISTS "%s_bypass_policy" ON "%s"', tbl_name, tbl_name);
        EXECUTE format('DROP POLICY IF EXISTS "%s_isolation_policy" ON "%s"', tbl_name, tbl_name);
        
        -- Create bypass policy
        EXECUTE format($policy$
            CREATE POLICY "%s_bypass_policy" ON "%s"
            FOR ALL USING (current_setting('app.current_role', true) = 'super_admin')
        $policy$, tbl_name, tbl_name);
        
        -- Check if table has organizationId column
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = tbl_name
            AND column_name = 'organizationId'
        ) INTO has_org_id;
        
        IF has_org_id THEN
            -- Create isolation policy for tables with organizationId
            EXECUTE format($policy$
                CREATE POLICY "%s_isolation_policy" ON "%s"
                FOR ALL USING (
                    current_setting('app.current_role', true) = 'super_admin' OR
                    "organizationId" = current_setting('app.current_organization_id', true)
                )
            $policy$, tbl_name, tbl_name);
        END IF;
        
        RAISE NOTICE 'Applied RLS policies for table: %', tbl_name;
    END LOOP;
END $$;
