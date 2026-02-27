#!/bin/bash

echo "Ì¥ê Manual Token Rotation Test"
echo "============================"

# 1. Login and save cookies
echo -e "\n1. Login..."
curl -c cookies.txt -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@helixcrm.test","password":"Admin123!"}' \
  -o /dev/null -s

echo "   Cookies saved"

# 2. Extract refresh token
TOKEN1=$(grep refresh_token cookies.txt | awk '{print $NF}')
echo "   Token 1 extracted (length: ${#TOKEN1})"

# 3. First refresh
echo -e "\n2. First refresh..."
curl -c cookies2.txt -b cookies.txt -X POST http://localhost:3001/api/v1/auth/refresh \
  -o /dev/null -s

TOKEN2=$(grep refresh_token cookies2.txt | awk '{print $NF}')
echo "   Token 2 extracted (length: ${#TOKEN2})"

# 4. Compare
echo -e "\n3. Comparing tokens..."
if [ "$TOKEN1" = "$TOKEN2" ]; then
    echo "   ‚ùå Tokens are the SAME - rotation not working"
else
    echo "   ‚úÖ Tokens are DIFFERENT - rotation working!"
    
    # 5. Test old token
    echo -e "\n4. Testing old token..."
    curl -b cookies.txt -X POST http://localhost:3001/api/v1/auth/refresh \
      -o response.json -s
    
    if grep -q "access_token" response.json; then
        echo "   ‚ùå OLD TOKEN STILL WORKS - SECURITY BUG!"
        echo "   Response: $(cat response.json | head -c 100)..."
    else
        echo "   ‚úÖ OLD TOKEN REJECTED - SECURITY FIXED!"
        echo "   Response: $(cat response.json)"
    fi
fi

# Cleanup
rm -f cookies.txt cookies2.txt response.json
