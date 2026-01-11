#!/bin/bash

echo "🧪 Comprehensive CSRF Testing"
echo "============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check backend
echo -e "${YELLOW}1. Checking backend...${NC}"
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${RED}❌ Backend not running${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend running${NC}"

# Test 1: Get CSRF token
echo -e "\n${YELLOW}2. Testing CSRF token endpoint...${NC}"
CSRF_RESPONSE=$(curl -s http://localhost:3001/api/v1/auth/csrf-token)
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

if [[ -z "$CSRF_TOKEN" ]]; then
    echo -e "${RED}❌ No CSRF token received${NC}"
    echo "Response: $CSRF_RESPONSE"
    exit 1
fi

if [[ "$CSRF_TOKEN" == "development-mode" ]]; then
    echo -e "${RED}❌ Still in development mode!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Got real CSRF token: ${CSRF_TOKEN:0:20}...${NC}"

# Test 2: POST without CSRF token (should get 403)
echo -e "\n${YELLOW}3. Testing POST without CSRF token (should fail with 403)...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/api/v1/contacts \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","firstName":"Test","lastName":"User"}')

if [[ "$RESPONSE" == "403" ]]; then
    echo -e "${GREEN}✅ Correctly rejected with 403 (no CSRF token)${NC}"
elif [[ "$RESPONSE" == "500" ]]; then
    echo -e "${YELLOW}⚠️  Got 500 (might be error in middleware)${NC}"
    
    # Check error details
    ERROR_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/contacts \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","firstName":"Test","lastName":"User"}')
    echo "Error details: $ERROR_RESPONSE"
else
    echo -e "${RED}❌ Unexpected response: $RESPONSE${NC}"
fi

# Test 3: POST with invalid CSRF token (should also fail)
echo -e "\n${YELLOW}4. Testing POST with invalid CSRF token...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/api/v1/contacts \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: invalid-token-123" \
    -d '{"email":"test@example.com","firstName":"Test","lastName":"User"}')

if [[ "$RESPONSE" == "403" ]]; then
    echo -e "${GREEN}✅ Correctly rejected with 403 (invalid CSRF token)${NC}"
else
    echo -e "${RED}❌ Unexpected response: $RESPONSE${NC}"
fi

# Test 4: GET request (should work without CSRF)
echo -e "\n${YELLOW}5. Testing GET request (should work without CSRF)...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/contacts)

if [[ "$RESPONSE" == "200" || "$RESPONSE" == "401" ]]; then
    echo -e "${GREEN}✅ GET request responded with $RESPONSE (as expected)${NC}"
else
    echo -e "${RED}❌ GET request failed: $RESPONSE${NC}"
fi

# Test 5: Login endpoint (should work without CSRF)
echo -e "\n${YELLOW}6. Testing login endpoint (should work without CSRF)...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@helixcrm.test","password":"Admin123!"}')

if [[ "$RESPONSE" == "200" || "$RESPONSE" == "401" ]]; then
    echo -e "${GREEN}✅ Login endpoint responded with $RESPONSE (as expected)${NC}"
else
    echo -e "${RED}❌ Login endpoint failed: $RESPONSE${NC}"
fi

echo -e "\n${GREEN}============================="
echo "✅ CSRF Testing Complete"
echo "=============================${NC}"