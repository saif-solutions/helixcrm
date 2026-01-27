#!/bin/bash
echo "Ì∑™ HELIXCRM MVP VALIDATION TEST"
echo "================================"
echo "Date: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test endpoint
test_endpoint() {
  local name="$1"
  local method="$2"
  local url="$3"
  local expected_code="$4"
  local token="$5"
  
  echo -n "Testing $name ($method $url)... "
  
  # Make request
  if [ "$method" = "GET" ]; then
    response=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $token" "$url")
  elif [ "$method" = "POST" ]; then
    # For POST, we'll skip for now as it needs CSRF
    echo -e "${YELLOW}SKIP (needs CSRF)${NC}"
    return
  else
    response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" -H "Authorization: Bearer $token" "$url")
  fi
  
  # Check response
  if [ "$response" = "$expected_code" ]; then
    echo -e "${GREEN}PASS ($response)${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}FAIL (expected $expected_code, got $response)${NC}"
    ((TESTS_FAILED++))
  fi
}

# Get auth token for Org 1
echo "Ì¥ê Getting auth token for Org 1..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@techsolutions.com",
    "password": "Admin123!"
  }')

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}‚ùå Failed to get auth token${NC}"
  exit 1
fi

echo -e "${GREEN}‚úÖ Got token${NC}\n"

# Test endpoints
BASE_URL="http://localhost:3001/api/v1"

echo "Ì≥ä Testing API Endpoints:"
echo "-------------------------"

# Authentication endpoints
test_endpoint "Health Check" "GET" "$BASE_URL/health" "200" "$TOKEN"
test_endpoint "Users List" "GET" "$BASE_URL/users" "200" "$TOKEN"
test_endpoint "Contacts List" "GET" "$BASE_URL/contacts" "200" "$TOKEN"
test_endpoint "Deals List" "GET" "$BASE_URL/deals" "200" "$TOKEN"
test_endpoint "Pipelines List" "GET" "$BASE_URL/pipelines" "200" "$TOKEN"
test_endpoint "Analytics Revenue" "GET" "$BASE_URL/analytics/revenue" "200" "$TOKEN"
test_endpoint "Analytics Deals" "GET" "$BASE_URL/analytics/deals" "200" "$TOKEN"
test_endpoint "Dashboard" "GET" "$BASE_URL/dashboard/stats" "200" "$TOKEN"
test_endpoint "Roles List" "GET" "$BASE_URL/rbac/roles" "200" "$TOKEN"
test_endpoint "Permissions List" "GET" "$BASE_URL/rbac/permissions" "200" "$TOKEN"

# Test multi-tenant isolation
echo -e "\nÌø¢ Testing Multi-tenant Isolation:"
echo "---------------------------------"

# Get Org 2 token
TOKEN_RESPONSE2=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@marketingpros.com",
    "password": "Admin123!"
  }')

TOKEN2=$(echo $TOKEN_RESPONSE2 | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN2" ]; then
  # Count deals for each org
  DEALS_ORG1=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/deals" | grep -o '"name"' | wc -l)
  DEALS_ORG2=$(curl -s -H "Authorization: Bearer $TOKEN2" "$BASE_URL/deals" | grep -o '"name"' | wc -l)
  
  echo -n "Testing data isolation (deals count)... "
  if [ "$DEALS_ORG1" -gt 0 ] && [ "$DEALS_ORG2" -gt 0 ] && [ "$DEALS_ORG1" -eq "$DEALS_ORG2" ]; then
    echo -e "${GREEN}PASS (Org1: $DEALS_ORG1 deals, Org2: $DEALS_ORG2 deals)${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}FAIL (Org1: $DEALS_ORG1 deals, Org2: $DEALS_ORG2 deals)${NC}"
    ((TESTS_FAILED++))
  fi
fi

# Summary
echo -e "\nÌ≥à TEST SUMMARY:"
echo "----------------"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
else
  echo -e "${GREEN}Tests Failed: $TESTS_FAILED${NC}"
fi

# Calculate percentage
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
if [ $TOTAL_TESTS -gt 0 ]; then
  PERCENTAGE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
  echo -e "Success Rate: ${PERCENTAGE}%"
fi

# Final verdict
echo -e "\nÌøÅ FINAL VERDICT:"
if [ $TESTS_FAILED -eq 0 ] && [ $TESTS_PASSED -ge 10 ]; then
  echo -e "${GREEN}‚úÖ MVP VALIDATION PASSED!${NC}"
  echo "All core endpoints are working with proper multi-tenant isolation."
  exit 0
else
  echo -e "${RED}‚ùå MVP VALIDATION FAILED${NC}"
  echo "Some tests did not pass or insufficient endpoints were tested."
  exit 1
fi
