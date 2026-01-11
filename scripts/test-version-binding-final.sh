#!/bin/bash

echo "Ì¥ê FINAL TEST: VERSION BINDING FIX"
echo "=================================="

# Clean up
rm -f *.txt *.json 2>/dev/null

# 1. Login
echo -e "\n1. Login..."
curl -c cookies1.txt -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@helixcrm.test","password":"Admin123!"}' \
  -o /dev/null -s

echo "   ‚úÖ Login complete"

# 2. First refresh (should work)
echo -e "\n2. First refresh (should work)..."
curl -c cookies2.txt -b cookies1.txt -X POST http://localhost:3001/api/v1/auth/refresh \
  -o refresh1.json -s

if grep -q "access_token" refresh1.json; then
    echo "   ‚úÖ First refresh successful"
else
    echo "   ‚ùå First refresh failed"
    cat refresh1.json
    exit 1
fi

# 3. Try OLD token (should FAIL with security message)
echo -e "\n3. Trying OLD token (should fail with security error)..."
RESPONSE=$(curl -s -b cookies1.txt -X POST http://localhost:3001/api/v1/auth/refresh)

if echo "$RESPONSE" | grep -q "access_token"; then
    echo "   ‚ùå OLD TOKEN STILL WORKS - BUG NOT FIXED"
    echo "   Response preview: ${RESPONSE:0:200}"
elif echo "$RESPONSE" | grep -qi "reuse\|security\|breach\|unauthorized"; then
    echo "   ‚úÖ OLD TOKEN REJECTED WITH SECURITY MESSAGE"
    echo "   Security response detected"
    echo "   Response: $RESPONSE"
else
    echo "   ? Unexpected response: $RESPONSE"
fi

# 4. Try NEW token (should work)
echo -e "\n4. Trying NEW token (should work)..."
RESPONSE=$(curl -s -b cookies2.txt -X POST http://localhost:3001/api/v1/auth/refresh)

if echo "$RESPONSE" | grep -q "access_token"; then
    echo "   ‚úÖ NEW token works correctly"
else
    echo "   ‚ùå NEW token failed"
    echo "   Response: $RESPONSE"
fi

# Cleanup
rm -f cookies*.txt *.json

echo -e "\nÌæØ TEST SUMMARY:"
echo "   - Login: ‚úì"
echo "   - First refresh: ‚úì"
echo "   - Old token rejection: (check above)"
echo "   - New token works: (check above)"
echo -e "\nÌ≥ä Check server logs for:"
echo "   - 'TOKEN REUSE ATTACK DETECTED' message"
echo "   - Version comparisons"
