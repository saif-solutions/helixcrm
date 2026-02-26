#!/bin/bash
echo "��� VERIFYING INSTALLATION"
echo "========================="

echo "1. Checking node_modules existence:"
[ -d "node_modules" ] && echo "  ✅ Root node_modules" || echo "  ❌ Root node_modules missing"
[ -d "apps/api/node_modules" ] && echo "  ✅ Backend node_modules" || echo "  ❌ Backend node_modules missing"
[ -d "apps/web/node_modules" ] && echo "  ✅ Frontend node_modules" || echo "  ❌ Frontend node_modules missing"

echo -e "\n2. Checking key dependencies:"
echo "  Root has turbo: $(ls node_modules/.bin/turbo 2>/dev/null && echo '✅' || echo '❌')"
echo "  Backend has nest: $(ls apps/api/node_modules/.bin/nest 2>/dev/null && echo '✅' || echo '❌')"
echo "  Frontend has vite: $(ls apps/web/node_modules/.bin/vite 2>/dev/null && echo '✅' || echo '❌')"

echo -e "\n3. Checking TypeScript compilation:"
cd apps/web
npx tsc --noEmit --skipLibCheck 2>&1 | head -5
cd ../..

echo -e "\n4. Quick build test:"
echo "  Backend builds: $(cd apps/api && npm run build 2>&1 | grep -q "success" && echo '✅' || echo '❌')"
echo "  Frontend builds: $(cd apps/web && npm run build 2>&1 | tail -3 | grep -q "built" && echo '✅' || echo '❌')"

echo -e "\n��� READY STATUS:"
echo "If all checks pass, your environment is ready."
echo "If any checks fail, review the error messages above."
