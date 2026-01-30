#!/bin/bash

echo "ÌæØ DIRECT TEST - Step by Step"
echo "============================="

# 1. Login
echo -e "\n1. Login..."
curl -c cookies1.txt -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@helixcrm.test","password":"Admin123!"}' \
  -o login.json -s

TOKEN1=$(grep refresh_token cookies1.txt | awk '{print $NF}')
echo "   Token 1: ${TOKEN1:0:30}..."
echo "   Length: ${#TOKEN1}"

# 2. Check what's in the JWT
echo -e "\n2. Decoding Token 1..."
PAYLOAD1=$(echo "$TOKEN1" | cut -d'.' -f2 | base64 -d 2>/dev/null || echo "Cannot decode")
echo "   Payload: $PAYLOAD1"

# 3. First refresh
echo -e "\n3. First refresh..."
curl -c cookies2.txt -b cookies1.txt -X POST http://localhost:3001/api/v1/auth/refresh \
  -o refresh1.json -s

TOKEN2=$(grep refresh_token cookies2.txt | tail -1 | awk '{print $NF}')
echo "   Token 2: ${TOKEN2:0:30}..."
echo "   Length: ${#TOKEN2}"

# 4. Compare
echo -e "\n4. Comparing..."
if [ "$TOKEN1" = "$TOKEN2" ]; then
    echo "   ‚ùå TOKENS ARE IDENTICAL!"
else
    echo "   ‚úÖ Tokens are different"
    
    echo -e "\n5. Decoding Token 2..."
    PAYLOAD2=$(echo "$TOKEN2" | cut -d'.' -f2 | base64 -d 2>/dev/null || echo "Cannot decode")
    echo "   Payload: $PAYLOAD2"
fi

# 5. Try old token
echo -e "\n6. Testing OLD token..."
RESPONSE=$(curl -s -b cookies1.txt -X POST http://localhost:3001/api/v1/auth/refresh)
if echo "$RESPONSE" | grep -q "access_token"; then
    echo "   ‚ùå OLD TOKEN STILL WORKS!"
    echo "   Response has access_token"
else
    echo "   ‚úÖ OLD TOKEN REJECTED"
fi

# Cleanup
rm -f cookies*.txt *.json
