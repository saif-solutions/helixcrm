#!/bin/bash
echo "��� COMPLETE RESET SCRIPT"
echo "========================"

echo "1. Stop all processes..."
pkill -f "vite" 2>/dev/null && echo "✅ Stopped Vite" || echo "⚠️  Vite not running"
pkill -f "node.*3000" 2>/dev/null && echo "✅ Stopped backend" || echo "⚠️  Backend not running"

echo -e "\n2. Clear node_modules caches..."
cd apps/web
rm -rf node_modules/.vite 2>/dev/null && echo "✅ Cleared Vite cache" || echo "⚠️  No Vite cache"
rm -rf dist 2>/dev/null && echo "✅ Cleared dist folder" || echo "⚠️  No dist folder"
cd ../..

echo -e "\n3. Verify critical files..."
echo "   ContactsPage.tsx size: $(wc -l < apps/web/src/pages/ContactsPage.tsx) lines"
echo "   Has export api: $(grep -q "export const api = " apps/web/src/services/api.ts && echo '✅' || echo '❌')"
echo "   TypeScript check: $(cd apps/web && npx tsc --noEmit --skipLibCheck 2>&1 | grep -q "error" && echo '❌ Has errors' || echo '✅ Clean')"

echo -e "\n4. Restart backend..."
cd apps/api
npm run start:dev &
BACKEND_PID=$!
echo "✅ Backend starting (PID: $BACKEND_PID)"
cd ../..

echo -e "\n5. Wait for backend..."
sleep 3
curl -s http://localhost:3000/health > /dev/null && echo "✅ Backend ready" || echo "❌ Backend not responding"

echo -e "\n6. Restart frontend..."
cd apps/web
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend starting (PID: $FRONTEND_PID)"
cd ../..

echo -e "\n7. Wait for frontend..."
sleep 5
curl -s http://localhost:5173 > /dev/null && echo "✅ Frontend ready" || echo "❌ Frontend not responding"

echo -e "\n��� FINAL INSTRUCTIONS:"
echo "1. CLEAR BROWSER CACHE COMPLETELY (Ctrl+Shift+Delete)"
echo "2. Open http://localhost:5173 in PRIVATE/INCOGNITO window"
echo "3. Login with user_a@test.com / TestPass123!"
echo "4. Check Console for errors"
echo "5. Navigate to Contacts page"
echo ""
echo "Using incognito ensures no cached files interfere."
