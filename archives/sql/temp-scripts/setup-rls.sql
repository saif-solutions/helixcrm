-- apps/api/prisma/scripts/setup-rls.sql
-- Enable RLS and create policies
DO $$ 
BEGIN
  -- Enable RLS on all tenant tables
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
  
  -- Create tenant isolation policies
  DROP POLICY IF EXISTS tenant_isolation ON users;
  CREATE POLICY tenant_isolation ON users
    USING (organization_id = current_setting('app.current_organization_id')::uuid);
    
  DROP POLICY IF EXISTS tenant_isolation ON contacts;
  CREATE POLICY tenant_isolation ON contacts
    USING (organization_id = current_setting('app.current_organization_id')::uuid);
    
  DROP POLICY IF EXISTS tenant_isolation ON accounts;
  CREATE POLICY tenant_isolation ON accounts
    USING (organization_id = current_setting('app.current_organization_id')::uuid);
    
  DROP POLICY IF EXISTS tenant_isolation ON activities;
  CREATE POLICY tenant_isolation ON activities
    USING (organization_id = current_setting('app.current_organization_id')::uuid);
    
  RAISE NOTICE 'RLS policies created successfully';
END $$;