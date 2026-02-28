#!/bin/bash
# scripts/testing/auth/test-with-tenant.sh
# Helper script to test authenticated endpoints with tenant context

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:3001/api/v1"

echo -e "${BLUE}🔐 HelixCRM Authenticated API Test${NC}"
echo "======================================"

# Step 1: Login to get token and org ID
echo -e "\n${YELLOW}Step 1: Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@helixcrm.com","password":"Test123!"}')

# Extract token and organization ID using grep and cut
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
ORG_ID=$(echo $LOGIN_RESPONSE | grep -o '"organizationId":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ] || [ -z "$ORG_ID" ]; then
    echo -e "${RED}❌ Login failed. Response:${NC}"
    echo $LOGIN_RESPONSE | jq '.' 2>/dev/null || echo $LOGIN_RESPONSE
    exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo -e "  Token: ${YELLOW}${TOKEN:0:20}...${NC}"
echo -e "  Org ID: ${BLUE}$ORG_ID${NC}"

# Step 2: Test /users/me with tenant header
echo -e "\n${YELLOW}Step 2: Testing /users/me with tenant header...${NC}"
ME_RESPONSE=$(curl -s -X GET "${API_URL}/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $ORG_ID")

if echo "$ME_RESPONSE" | grep -q "id"; then
    echo -e "${GREEN}✅ User profile retrieved successfully${NC}"
    echo "$ME_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Failed to get user profile${NC}"
    echo "$ME_RESPONSE" | jq '.' 2>/dev/null || echo "$ME_RESPONSE"
fi

# Step 3: Test without tenant header (should fail)
echo -e "\n${YELLOW}Step 3: Testing without tenant header (should fail)...${NC}"
FAIL_RESPONSE=$(curl -s -X GET "${API_URL}/users/me" \
  -H "Authorization: Bearer $TOKEN" -w "\n%{http_code}")

HTTP_CODE=$(echo "$FAIL_RESPONSE" | tail -n1)
BODY=$(echo "$FAIL_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 403 ] || [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✅ Correctly failed with status $HTTP_CODE (tenant isolation working)${NC}"
else
    echo -e "${RED}❌ Unexpected status code: $HTTP_CODE${NC}"
fi

# Step 4: Test a few other endpoints
echo -e "\n${YELLOW}Step 4: Testing contacts endpoint...${NC}"
CONTACTS_RESPONSE=$(curl -s -X GET "${API_URL}/contacts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $ORG_ID" -w "\n%{http_code}")

HTTP_CODE=$(echo "$CONTACTS_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Contacts endpoint accessible${NC}"
else
    echo -e "${YELLOW}⚠️ Contacts endpoint returned $HTTP_CODE (may be empty)${NC}"
fi

echo -e "\n${BLUE}======================================${NC}"
echo -e "${GREEN}🎉 All tests complete!${NC}"
echo -e "\n${YELLOW}Next steps for your frontend app:${NC}"
echo "1. Store organizationId from login response"
echo "2. Include 'x-tenant-id: \${organizationId}' header in all API requests"
echo "3. Update your API client configuration"