#!/bin/bash
echo "=== Testing Header/Body Request ID Consistency ==="

echo -e "\n1. Test 404 endpoint WITHOUT providing X-Request-ID:"
echo "Making request..."
RESPONSE=$(curl -s -i http://localhost:3001/api/v1/nonexistent)
HEADER_ID=$(echo "$RESPONSE" | grep -i "x-request-id:" | head -1 | cut -d' ' -f2- | tr -d '\r')
BODY_ID=$(echo "$RESPONSE" | tail -1 | grep -o '"requestId":"[^"]*"' | cut -d'"' -f4)

echo "Header X-Request-ID: $HEADER_ID"
echo "Body requestId: $BODY_ID"

if [ "$HEADER_ID" = "$BODY_ID" ]; then
    echo "✅ CONSISTENT: Header and Body match"
else
    echo "❌ INCONSISTENT: Header ($HEADER_ID) != Body ($BODY_ID)"
fi

echo -e "\n2. Test 404 endpoint WITH provided X-Request-ID:"
TEST_UUID="test-uuid-$(date +%s)"
echo "Using test UUID: $TEST_UUID"

RESPONSE=$(curl -s -i http://localhost:3001/api/v1/nonexistent -H "X-Request-ID: $TEST_UUID")
HEADER_ID=$(echo "$RESPONSE" | grep -i "x-request-id:" | head -1 | cut -d' ' -f2- | tr -d '\r')
BODY_ID=$(echo "$RESPONSE" | tail -1 | grep -o '"requestId":"[^"]*"' | cut -d'"' -f4)

echo "Header X-Request-ID: $HEADER_ID"
echo "Body requestId: $BODY_ID"

if [ "$HEADER_ID" = "$BODY_ID" ]; then
    echo "✅ CONSISTENT: Header and Body match"
else
    echo "❌ INCONSISTENT: Header ($HEADER_ID) != Body ($BODY_ID)"
fi

echo -e "\n3. Test health endpoint (200 OK):"
RESPONSE=$(curl -s -i http://localhost:3001/api/v1/health)
HEADER_ID=$(echo "$RESPONSE" | grep -i "x-request-id:" | head -1 | cut -d' ' -f2- | tr -d '\r')

echo "Header X-Request-ID: $HEADER_ID"
echo "Response body has no requestId (expected for 200 responses)"
