#!/bin/bash
# test-csrf.sh - Test login, CSRF, and POST request
# Usage: ./test-csrf.sh

API_URL="http://localhost:3001/api/v1"
COOKIE_FILE="cookies.txt"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq not found. Install with:${NC}"
    echo "  - Linux: sudo apt-get install jq"
    echo "  - Mac: brew install jq"
    echo "  - Windows: choco install jq"
    echo -e "${YELLOW}Falling back to grep/cut method...${NC}\n"
    USE_JQ=0
else
    USE_JQ=1
fi

# Clear previous cookies
rm -f $COOKIE_FILE

echo -e "${GREEN}=== 1️⃣ Logging in ===${NC}"
LOGIN_RESPONSE=$(curl -s -c $COOKIE_FILE -b $COOKIE_FILE \
  -H "Content-Type: application/json" \
  -d '{"email":"test@helixcrm.com","password":"Test123!"}' \
  "$API_URL/auth/login")

if [ $USE_JQ -eq 1 ]; then
    echo "$LOGIN_RESPONSE" | jq '.'
else
    echo "$LOGIN_RESPONSE"
fi
echo

echo -e "${GREEN}=== 2️⃣ Fetching CSRF token ===${NC}"
CSRF_RESPONSE=$(curl -s -c $COOKIE_FILE -b $COOKIE_FILE \
  "$API_URL/auth/csrf-token")

if [ $USE_JQ -eq 1 ]; then
    CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r '.csrfToken')
    echo "$CSRF_RESPONSE" | jq '.'
else
    CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)
    echo "$CSRF_RESPONSE"
fi

if [ -z "$CSRF_TOKEN" ] || [ "$CSRF_TOKEN" == "null" ]; then
  echo -e "${RED}❌ Failed to obtain CSRF token${NC}"
  echo "Response: $CSRF_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ CSRF token obtained: $CSRF_TOKEN${NC}\n"

echo -e "${GREEN}=== 3️⃣ Creating a lead ===${NC}"
POST_RESPONSE=$(curl -s -c $COOKIE_FILE -b $COOKIE_FILE \
  -X POST "$API_URL/leads" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{"name":"John Doe","email":"john@example.com","status":"new"}')

if [ $USE_JQ -eq 1 ]; then
    echo "$POST_RESPONSE" | jq '.'
    
    # Check if successful (201 Created)
    if echo "$POST_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
        echo -e "\n${GREEN}✅ SUCCESS! Lead created with ID: $(echo "$POST_RESPONSE" | jq -r '.id')${NC}"
    else
        echo -e "\n${RED}❌ Failed to create lead${NC}"
    fi
else
    echo "$POST_RESPONSE"
fi

echo -e "\n${GREEN}=== 4️⃣ Cookie contents ===${NC}"
cat $COOKIE_FILE
echo

echo -e "${GREEN}=== 5️⃣ Testing GET request (should work without CSRF) ===${NC}"
GET_RESPONSE=$(curl -s -b $COOKIE_FILE \
  "$API_URL/leads?page=1&limit=5")

if [ $USE_JQ -eq 1 ]; then
    LEAD_COUNT=$(echo "$GET_RESPONSE" | jq '.data | length')
    echo "Found $LEAD_COUNT leads"
else
    echo "$GET_RESPONSE"
fi