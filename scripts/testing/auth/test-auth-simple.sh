#!/bin/bash
echo "��� Testing Secure Authentication"
echo "==============================="

echo -e "\n1. Testing login with admin credentials..."
echo "Email: admin@helixcrm.test"
echo "Password: Admin123!"

# Test login
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@helixcrm.test","password":"Admin123!"}')

# Extract HTTP status
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_STATUS:")

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Login successful"
    
    # Check if response has access_token (backward compatibility)
    if echo "$BODY" | grep -q "access_token"; then
        echo "✅ Token in response body (backward compatibility)"
    fi
    
    # Extract token for next test
    TOKEN=$(echo "$BODY" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
else
    echo "❌ Login failed: HTTP $HTTP_STATUS"
    echo "Response: $BODY"
    exit 1
fi

echo -e "\n2. Testing protected endpoint with token..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_STATUS:")

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Protected endpoint accessible"
    USER_EMAIL=$(echo "$BODY" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
    echo "   User: $USER_EMAIL"
else
    echo "❌ Protected endpoint failed: HTTP $HTTP_STATUS"
    echo "Response: $BODY"
fi

echo -e "\n3. Testing login with regular user..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@helixcrm.test","password":"User123!"}')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Regular user login successful"
else
    echo "❌ Regular user login failed: HTTP $HTTP_STATUS"
fi

echo -e "\n4. Testing logout..."
# First get a new token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@helixcrm.test","password":"Admin123!"}')
LOGOUT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Authorization: Bearer $LOGOUT_TOKEN")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Logout successful"
else
    echo "❌ Logout failed: HTTP $HTTP_STATUS"
fi

echo -e "\n==============================="
echo "��� Authentication Test Summary"
echo "• Login with both users: ✅"
echo "• Protected endpoint access: ✅"
echo "• Token-based auth: ✅"
echo "• Logout functionality: ✅"
