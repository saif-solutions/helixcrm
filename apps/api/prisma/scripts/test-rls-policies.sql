-- Test script for RLS policies
-- Set a test tenant ID
SET app.current_tenant_id = '00000000-0000-0000-0000-000000000001';

-- Test 1: Check if we can see organizations
SELECT 'Test 1: Organizations' as test_name;
SELECT COUNT(*) as organization_count FROM "organizations";

-- Test 2: Check if we can see users
SELECT 'Test 2: Users' as test_name;
SELECT COUNT(*) as user_count FROM "users";

-- Test 3: Check if we can see contacts
SELECT 'Test 3: Contacts' as test_name;
SELECT COUNT(*) as contact_count FROM "contacts";

-- Test 4: Check if we can see deals
SELECT 'Test 4: Deals' as test_name;
SELECT COUNT(*) as deal_count FROM "deals";

-- Test 5: Check cross-tenant data leak prevention
-- Switch to different tenant
SET app.current_tenant_id = '00000000-0000-0000-0000-000000000002';
SELECT 'Test 5: Cross-tenant isolation' as test_name;
SELECT COUNT(*) as user_count_diff_tenant FROM "users";

-- Reset
RESET app.current_tenant_id;
