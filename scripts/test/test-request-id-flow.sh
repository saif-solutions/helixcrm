#!/bin/bash
echo "=== Testing Request ID Consistency ==="

# Generate a test UUID
TEST_UUID=$(node -e "console.log(require('crypto').randomUUID())")
echo "Test UUID: $TEST_UUID"

echo -e "\n1. Making request with our UUID..."
curl -s "http://localhost:3001/api/v1/nonexistent" \
  -H "X-Request-ID: $TEST_UUID" \
  -w "\nHeader X-Request-ID: %{header_x-request-id}\n" \
  -o /dev/null

echo -e "\n2. Checking response body..."
RESPONSE=$(curl -s "http://localhost:3001/api/v1/nonexistent" \
  -H "X-Request-ID: $TEST_UUID")
echo "Response body requestId: $(echo "$RESPONSE" | grep -o '"requestId":"[^"]*"' | cut -d'"' -f4)"

echo -e "\n3. Making another request without header (should generate new UUID)..."
curl -s "http://localhost:3001/api/v1/health" \
  -w "\nHeader X-Request-ID: %{header_x-request-id}\n" \
  -o /dev/null
