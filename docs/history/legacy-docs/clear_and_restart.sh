#!/bin/bash
echo "Ì¥Ñ CLEARING CACHE AND RESTARTING"
echo "================================"

echo "1. Checking frontend dev server..."
if curl -s http://localhost:5173 > /dev/null; then
    echo "‚úÖ Frontend is running"
else
    echo "‚ùå Frontend not running, starting it..."
    cd apps/web
    npm run dev &
    cd ../..
    sleep 5
fi

echo -e "\n2. Clear browser cache instructions:"
echo "   For Chrome/Edge:"
echo "   - Press Ctrl+Shift+Delete"
echo "   - Select 'All time' time range"
echo "   - Check 'Cached images and files'"
echo "   - Click 'Clear data'"
echo ""
echo "   For Firefox:"
echo "   - Press Ctrl+Shift+Delete"
echo "   - Select 'Everything' time range"
echo "   - Check 'Cache'"
echo "   - Click 'OK'"

echo -e "\n3. Hard refresh instructions:"
echo "   - Open http://localhost:5173"
echo "   - Press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)"
echo "   - This performs a hard refresh ignoring cache"

echo -e "\n4. If still having issues, try:"
echo "   a) Close all browser tabs/windows"
echo "   b) Restart the browser"
echo "   c) Open new window and go to http://localhost:5173"

echo -e "\n5. Debug mode check:"
echo "   - Open DevTools (F12)"
echo "   - Go to Network tab"
echo "   - Check 'Disable cache'"
echo "   - Reload page (Ctrl+R)"

echo -e "\nÌæØ FINAL TEST STEPS:"
echo "1. Go to http://localhost:5173"
echo "2. Login with user_a@test.com / TestPass123!"
echo "3. Check Console tab for errors"
echo "4. Navigate to Contacts page"
echo "5. Should see 2 contacts loaded"
