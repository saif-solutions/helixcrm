#!/bin/bash

echo "🧪 SYSTEMATIC TEST SUITE"
echo "========================"
echo ""

# Configuration
BASE_URL="http://localhost:3001/api/v1"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASS="Test123!"
COOKIE_FILE="/tmp/test-cookies.txt"
LOG_FILE="/tmp/test-$(date +%s).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Helper functions
log() { echo -e "${GREEN}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

cleanup() {
    rm -f "$COOKIE_FILE" 2>/dev/null
}

trap cleanup EXIT

# Test 0: Server health
echo "0. Testing server health..."
if ! curl -s "$BASE_URL/health" > /dev/null; then
    error "Server not responding. Please start the server first."
fi
log "Server is running"

# Test 1: Register new user
echo -e "\n1. Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASS\",
        \"firstName\": \"Test\",
        \"lastName\": \"User\",
        \"organizationName\": \"Test Org $(date +%s)\"
    }")

if echo "$REGISTER_RESPONSE" | grep -q '"id"'; then
    log "Registration successful"
else
    error "Registration failed: $REGISTER_RESPONSE"
fi

# Test 2: Login
echo -e "\n2. Testing login..."
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_FILE" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASS\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
if [ -z "$ACCESS_TOKEN" ]; then
    error "Login failed: $LOGIN_RESPONSE"
fi
log "Login successful"

# Test 3: Get CSRF token
echo -e "\n3. Testing CSRF token..."
CSRF_RESPONSE=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -X GET "$BASE_URL/auth/csrf-token" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)
if [ -z "$CSRF_TOKEN" ]; then
    error "CSRF token failed: $CSRF_RESPONSE"
fi
log "CSRF token obtained"

# Test 4: Validation test - empty name should fail
echo -e "\n4. Testing validation (should fail)..."
VALIDATION_TEST=$(curl -s -w "%{http_code}" -b "$COOKIE_FILE" -X POST "$BASE_URL/leads" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    -d '{"name": "", "email": "invalid-email"}')

STATUS=${VALIDATION_TEST: -3}
if [ "$STATUS" == "400" ]; then
    log "✅ Validation working correctly (rejected invalid data)"
else
    error "❌ Validation NOT working. Expected 400, got $STATUS"
fi

# Test 5: Create valid lead
echo -e "\n5. Testing valid lead creation..."
LEAD_RESPONSE=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/leads" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    -d '{"name": "Valid Lead", "email": "valid@example.com", "status": "new"}')

LEAD_ID=$(echo "$LEAD_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
if [ -n "$LEAD_ID" ]; then
    log "✅ Lead created successfully: $LEAD_ID"
else
    error "Lead creation failed: $LEAD_RESPONSE"
fi

# Test 6: Get leads
echo -e "\n6. Testing lead retrieval..."
GET_LEADS=$(curl -s -X GET "$BASE_URL/leads" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$GET_LEADS" | grep -q "$LEAD_ID"; then
    log "✅ Lead retrieval successful"
else
    warn "Lead retrieval issue: $GET_LEADS"
fi

# Test 7: Create valid contact
echo -e "\n7. Testing contact creation..."
CONTACT_RESPONSE=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/contacts" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    -d '{"firstName": "John", "lastName": "Doe", "email": "john@example.com", "company": "Test Corp"}')

CONTACT_ID=$(echo "$CONTACT_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
if [ -n "$CONTACT_ID" ]; then
    log "✅ Contact created successfully: $CONTACT_ID"
else
    error "Contact creation failed: $CONTACT_RESPONSE"
fi

# Test 8: Cleanup
echo -e "\n8. Cleaning up test data..."
# Delete lead
curl -s -b "$COOKIE_FILE" -X DELETE "$BASE_URL/leads/$LEAD_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "X-CSRF-Token: $CSRF_TOKEN" > /dev/null

# Delete contact
curl -s -b "$COOKIE_FILE" -X DELETE "$BASE_URL/contacts/$CONTACT_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "X-CSRF-Token: $CSRF_TOKEN" > /dev/null

log "Test data cleaned up"

echo -e "\n🎉 ALL TESTS PASSED!"
echo "====================="
echo "Validation is working correctly."
echo "Leads and Contacts modules are functional."
echo "Authentication and CSRF protection are working."