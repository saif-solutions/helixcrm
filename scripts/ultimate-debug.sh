#!/bin/bash

echo "í´¬ ULTIMATE DEBUG"
echo "================"

# Kill any existing cookies
rm -f *.txt *.json 2>/dev/null

# 1. Login with FULL trace
echo -e "\n1. LOGIN (with trace)..."
curl -v -c cookies1.txt -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@helixcrm.test","password":"Admin123!"}' \
  -o login.json 2> trace1.log

echo "   Saved: cookies1.txt, login.json, trace1.log"

# Check cookies
echo -e "\n   Cookies in cookies1.txt:"
cat cookies1.txt

TOKEN1=$(grep refresh_token cookies1.txt | awk '{print $NF}')
echo -e "\n   Token1 extracted: ${TOKEN1:0:50}..."
echo "   Token1 length: ${#TOKEN1}"

# 2. First refresh with FULL trace
echo -e "\n2. FIRST REFRESH (with trace)..."
curl -v -c cookies2.txt -b cookies1.txt -X POST http://localhost:3001/api/v1/auth/refresh \
  -o refresh1.json 2> trace2.log

echo "   Saved: cookies2.txt, refresh1.json, trace2.log"

echo -e "\n   Cookies in cookies2.txt:"
cat cookies2.txt

TOKEN2=$(grep refresh_token cookies2.txt | tail -1 | awk '{print $NF}')
echo -e "\n   Token2 extracted: ${TOKEN2:0:50}..."
echo "   Token2 length: ${#TOKEN2}"

# 3. Are they actually different?
echo -e "\n3. ACTUAL COMPARISON:"
if [ "$TOKEN1" = "$TOKEN2" ]; then
    echo "   âŒ TOKENS ARE 100% IDENTICAL"
    echo "   This means: NO ROTATION IS HAPPENING"
    echo "   The refresh endpoint might be returning the SAME token"
else
    echo "   âœ… Tokens are different"
    
    # Check if it's just whitespace differences
    TOKEN1_CLEAN=$(echo "$TOKEN1" | tr -d '[:space:]')
    TOKEN2_CLEAN=$(echo "$TOKEN2" | tr -d '[:space:]')
    
    if [ "$TOKEN1_CLEAN" = "$TOKEN2_CLEAN" ]; then
        echo "   âš ï¸  But they're the same after removing whitespace!"
    fi
fi

# 4. Check what the server is doing
echo -e "\n4. SERVER LOGS ANALYSIS:"
echo "   Check your server terminal for:"
echo "   - 'refresh_token_rotated' log messages"
echo "   - Any errors or warnings"
echo "   - Database update logs"

# 5. Manual test
echo -e "\n5. MANUAL TEST OF OLD TOKEN:"
echo "   Using ONLY token1 in cookie..."
cat > manual-cookie.txt << COOKIE
localhost	FALSE	/	FALSE	0	refresh_token	$TOKEN1
COOKIE

curl -s -b manual-cookie.txt -X POST http://localhost:3001/api/v1/auth/refresh | \
  python3 -c "import sys, json; data=sys.stdin.read(); print('   Response has access_token?:', 'access_token' in data)"
