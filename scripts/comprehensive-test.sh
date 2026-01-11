#!/bin/bash

echo "��� COMPREHENSIVE TOKEN DEBUG TEST"
echo "================================="

# Clean up
rm -f *.log *.json 2>/dev/null

# 1. Login with FULL verbose output
echo -e "\n1. LOGIN (verbose)..."
curl -v -k -c cookies-step1.txt -X POST https://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@helixcrm.test","password":"Admin123!"}' \
  -o login-response.json 2> login-debug.log

echo "   Saved: cookies-step1.txt, login-response.json, login-debug.log"

# Show cookies
echo -e "\n   Cookies after login:"
cat cookies-step1.txt | grep -i refresh_token

TOKEN1=$(grep -i refresh_token cookies-step1.txt | tail -1 | awk '{print $NF}')
echo -e "\n   Extracted token1 (first 30 chars): ${TOKEN1:0:30}..."

# 2. First refresh
echo -e "\n2. FIRST REFRESH..."
curl -v -k -b cookies-step1.txt -c cookies-step2.txt -X POST https://localhost:3001/api/v1/auth/refresh \
  -o refresh1-response.json 2> refresh1-debug.log

echo "   Saved: cookies-step2.txt, refresh1-response.json, refresh1-debug.log"

echo -e "\n   Cookies after refresh:"
cat cookies-step2.txt | grep -i refresh_token

TOKEN2=$(grep -i refresh_token cookies-step2.txt | tail -1 | awk '{print $NF}')
echo -e "\n   Extracted token2 (first 30 chars): ${TOKEN2:0:30}..."

# 3. Compare
echo -e "\n3. COMPARISON:"
echo "   Token1 == Token2 ? $(if [ "$TOKEN1" = "$TOKEN2" ]; then echo "YES ⚠️"; else echo "NO ✅"; fi)"
echo "   Token1 length: ${#TOKEN1}"
echo "   Token2 length: ${#TOKEN2}"

if [ "$TOKEN1" = "$TOKEN2" ]; then
  echo -e "\n⚠️  TOKENS ARE IDENTICAL! This means:"
  echo "   - Either token not rotated"
  echo "   - Or Set-Cookie header not sent"
  echo "   - Or cookie file not updated"
  
  # Check if Set-Cookie was in response
  echo -e "\n   Checking refresh response headers..."
  grep -i "set-cookie" refresh1-debug.log || echo "   No Set-Cookie header found!"
fi

# 4. Try to use old token
echo -e "\n4. TEST OLD TOKEN..."
# Create cookie with ONLY old token
cat > test-old-cookie.txt << COOKIE
# HTTP cookie file.
localhost	FALSE	/	FALSE	0	refresh_token	$TOKEN1
localhost	FALSE	/	FALSE	0	access_token	dummy
COOKIE

curl -k -s -b test-old-cookie.txt -X POST https://localhost:3001/api/v1/auth/refresh -o test-old.json

if grep -q "access_token" test-old.json; then
  echo "   ❌ OLD TOKEN STILL WORKS!"
  echo "   Response has access_token"
else
  echo "   ✅ OLD TOKEN REJECTED"
  echo "   Response: $(cat test-old.json | head -c 100)..."
fi

# 5. Check JWT structure
echo -e "\n5. JWT ANALYSIS:"
if [ -n "$TOKEN1" ]; then
  echo "   Token1 parts: $(echo "$TOKEN1" | grep -o "\." | wc -l)"
  # Decode payload
  PAYLOAD1=$(echo "$TOKEN1" | cut -d'.' -f2 | base64 -d 2>/dev/null || echo "Cannot decode")
  echo "   Token1 payload: $PAYLOAD1"
fi

if [ -n "$TOKEN2" ] && [ "$TOKEN1" != "$TOKEN2" ]; then
  PAYLOAD2=$(echo "$TOKEN2" | cut -d'.' -f2 | base64 -d 2>/dev/null || echo "Cannot decode")
  echo "   Token2 payload: $PAYLOAD2"
fi

# 6. Check server logs
echo -e "\n6. SERVER LOGS (check terminal running npm start):"
echo "   Look for 'refresh_token_rotated' events"
echo "   Check if oldVersion and newVersion are different"

echo -e "\n================================="
echo "Debug files created:"
ls -la *.txt *.json *.log 2>/dev/null
