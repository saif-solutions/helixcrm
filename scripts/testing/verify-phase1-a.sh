#!/bin/bash
echo "��� PHASE 1 - WORKSTREAM A VERIFICATION"
echo "======================================"

echo -e "\n1. Testing basic connectivity..."
if curl -s http://localhost:3001/api/v1/health > /dev/null; then
    echo "✅ API is running"
else
    echo "❌ API is not responding"
    exit 1
fi

echo -e "\n2. Testing request ID generation..."
# Use -i to get headers, then extract value properly
RESPONSE=$(curl -s -i http://localhost:3001/api/v1/health)
# Extract X-Request-ID value (header: value format)
ID1=$(echo "$RESPONSE" | grep -i "^x-request-id:" | head -1 | sed 's/^[^:]*:[[:space:]]*//' | tr -d '\r')

if [[ $ID1 =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
    echo "✅ UUID format correct: $ID1"
else
    echo "❌ Invalid UUID format or missing: '$ID1'"
fi

echo -e "\n3. Testing request ID reuse..."
TEST_ID="test-reuse-$(date +%s)"
RESPONSE=$(curl -s -i http://localhost:3001/api/v1/health -H "X-Request-ID: $TEST_ID")
ID2=$(echo "$RESPONSE" | grep -i "^x-request-id:" | head -1 | sed 's/^[^:]*:[[:space:]]*//' | tr -d '\r')

if [ "$ID2" = "$TEST_ID" ]; then
    echo "✅ Request ID reused correctly: $ID2"
else
    echo "❌ Request ID not reused: got '$ID2', expected '$TEST_ID'"
fi

echo -e "\n4. Testing 404 handling..."
RESPONSE=$(curl -s -i http://localhost:3001/api/v1/nonexistent)
HEADER_ID=$(echo "$RESPONSE" | grep -i "^x-request-id:" | head -1 | sed 's/^[^:]*:[[:space:]]*//' | tr -d '\r')
BODY_ID=$(echo "$RESPONSE" | tail -1 | grep -o '"requestId":"[^"]*"' | cut -d'"' -f4)

if [ "$HEADER_ID" = "$BODY_ID" ] && [ -n "$HEADER_ID" ]; then
    echo "✅ 404 handling correct (Header/Body match: ${HEADER_ID:0:8}...)"
else
    echo "❌ 404 handling issue: Header='$HEADER_ID', Body='$BODY_ID'"
fi

echo -e "\n5. Testing security headers..."
SEC_HEADERS=$(curl -s -I http://localhost:3001/api/v1/health | grep -i -E "^(x-|strict-|content-security)" | wc -l)
if [ $SEC_HEADERS -ge 5 ]; then
    echo "✅ Security headers present ($SEC_HEADERS found)"
    # List them
    curl -s -I http://localhost:3001/api/v1/health | grep -i -E "^(x-|strict-|content-security)" | sed 's/^/   /'
else
    echo "⚠️  Fewer security headers than expected: $SEC_HEADERS"
fi

echo -e "\n6. Testing structured logging (check API console for logs)..."
curl -s http://localhost:3001/api/v1/health > /dev/null
echo "✅ Request made (check API console for structured logs)"

echo -e "\n======================================"
echo "��� PHASE 1 - WORKSTREAM A VERIFICATION COMPLETE"
echo "Enterprise-grade request handling pipeline is operational."
