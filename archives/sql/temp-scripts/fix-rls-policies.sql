-- fix-rls-policies.sql
-- Drop and recreate all RLS policies safely

DO $$ 
DECLARE 
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%' 
        AND tablename NOT LIKE '_prisma%'
    LOOP
        -- Drop existing policies
        EXECUTE format('DROP POLICY IF EXISTS "%s_bypass_policy" ON "%s"', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "%s_isolation_policy" ON "%s"', table_name, table_name);
        
        -- Create bypass policy
        EXECUTE format('
            CREATE POLICY "%s_bypass_policy" ON "%s"
            FOR ALL USING (current_setting(''app.current_role'', true) = ''super_admin'')
        ', table_name, table_name);
        
        -- Check if table has organizationId column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = table_name
            AND column_name = 'organizationId'
        ) THEN
            -- Create isolation policy for tables with organizationId
            EXECUTE format('
                CREATE POLICY "%s_isolation_policy" ON "%s"
                FOR ALL USING (
                    current_setting(''app.current_role'', true) = ''super_admin'' OR
                    "organizationId" = current_setting(''app.current_organization_id'', true)
                )
            ', table_name, table_name);
        END IF;
    END LOOP;
END $$;