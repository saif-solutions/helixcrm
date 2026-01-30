#!/bin/bash

echo "🧪 Testing Validation Fix"
echo "========================"

BASE_URL="http://localhost:3001/api/v1"
EMAIL="testuser@example.com"
PASSWORD="Test123!"

# Login
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

# Get CSRF token and cookie
CSRF_RESPONSE=$(curl -s -c cookies.txt -X GET "$BASE_URL/auth/csrf-token" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)

echo "Testing lead validation..."

# Test 1: Empty name should fail
echo "Test 1: Creating lead with empty name..."
RESPONSE=$(curl -s -w "%{http_code}" -b cookies.txt -X POST "$BASE_URL/leads" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{"name": ""}')

STATUS=${RESPONSE: -3}
BODY=${RESPONSE%???}

if [ "$STATUS" == "400" ]; then
  echo "✅ PASS: Empty name correctly rejected with 400"
  echo "  Response: $BODY"
else
  echo "❌ FAIL: Expected 400, got $STATUS"
  echo "  Response: $BODY"
fi

# Test 2: Valid name should pass
echo -e "\nTest 2: Creating lead with valid name..."
RESPONSE=$(curl -s -w "%{http_code}" -b cookies.txt -X POST "$BASE_URL/leads" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{"name": "Valid Lead"}')

STATUS=${RESPONSE: -3}
BODY=${RESPONSE%???}

if [ "$STATUS" == "201" ]; then
  echo "✅ PASS: Valid name accepted with 201"
  LEAD_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  echo "  Lead ID: $LEAD_ID"
  
  # Clean up
  curl -s -X DELETE "$BASE_URL/leads/$LEAD_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "X-CSRF-Token: $CSRF_TOKEN" > /dev/null
else
  echo "❌ FAIL: Expected 201, got $STATUS"
  echo "  Response: $BODY"
fi

# Test 3: Invalid email should fail
echo -e "\nTest 3: Creating lead with invalid email..."
RESPONSE=$(curl -s -w "%{http_code}" -b cookies.txt -X POST "$BASE_URL/leads" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{"name": "Test Lead", "email": "invalid-email"}')

STATUS=${RESPONSE: -3}
BODY=${RESPONSE%???}

if [ "$STATUS" == "400" ]; then
  echo "✅ PASS: Invalid email correctly rejected with 400"
  echo "  Response: $BODY"
else
  echo "❌ FAIL: Expected 400, got $STATUS"
  echo "  Response: $BODY"
fi

rm -f cookies.txt
echo -e "\n🧪 Validation test complete!"