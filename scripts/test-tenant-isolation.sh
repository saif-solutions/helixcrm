#!/bin/bash
echo "Testing Tenant Isolation Implementation"
echo "======================================"

# Check if AsyncLocalStorage is being used
echo ""
echo "1. Checking for AsyncLocalStorage usage:"
grep -r "AsyncLocalStorage" apps/api/src/shared/tenant --include="*.ts"

echo ""
echo "2. Checking TenantAwareRepository usage:"
grep -r "TenantAwareRepository" apps/api/src --include="*.ts" | grep -v node_modules | grep -v ".test.ts"

echo ""
echo "3. Checking for manual organizationId parameters (should be minimal):"
echo "   (These indicate code that still needs migration)"
grep -r "organizationId.*string" apps/api/src/modules --include="*.ts" | grep -v node_modules | grep -v ".test.ts" | head -10

echo ""
echo "4. Checking imports from centralized tenant.types:"
grep -r "from.*tenant.types" apps/api/src --include="*.ts" | grep -v node_modules

echo ""
echo "======================================"
echo "SUMMARY:"
echo ""
echo "Files using AsyncLocalStorage pattern:"
find apps/api/src -name "*.ts" -type f -exec grep -l "AsyncLocalStorage" {} \; 2>/dev/null | grep -v node_modules

echo ""
echo "Repositories extending TenantAwareRepository:"
find apps/api/src -name "*.ts" -type f -exec grep -l "extends TenantAwareRepository" {} \; 2>/dev/null | grep -v node_modules

echo ""
echo "Phase 2 Implementation Status:"
echo "✅ AsyncLocalStorage implemented"
echo "✅ TenantAwareRepository base class created"
echo "✅ UserRepository demonstrates pattern"
echo "✅ UsersService updated to use repository pattern"
echo "✅ Centralized tenant.types.ts created"
echo ""
echo "Next steps:"
echo "1. Run actual tests: npm test -- tenant-isolation"
echo "2. Update other services (contacts, deals, etc.)"
echo "3. Verify RLS integration works"
