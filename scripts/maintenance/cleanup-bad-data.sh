#!/bin/bash

echo "🧹 Cleaning up invalid test data..."

BASE_URL="http://localhost:3001/api/v1"
EMAIL="testuser@example.com"
PASSWORD="Test123!"

# Login
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to login for cleanup"
  exit 1
fi

# Get all leads
LEADS_RESPONSE=$(curl -s -X GET "$BASE_URL/leads" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Found leads:"
echo "$LEADS_RESPONSE" | grep -o '"name":"[^"]*' | cut -d'"' -f4

# Delete leads with empty names or invalid emails
LEAD_IDS=$(echo "$LEADS_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
LEAD_NAMES=$(echo "$LEADS_RESPONSE" | grep -o '"name":"[^"]*' | cut -d'"' -f4)
LEAD_EMAILS=$(echo "$LEADS_RESPONSE" | grep -o '"email":"[^"]*' | cut -d'"' -f4)

i=1
for LEAD_ID in $LEAD_IDS; do
  NAME=$(echo "$LEAD_NAMES" | sed -n "${i}p")
  EMAIL=$(echo "$LEAD_EMAILS" | sed -n "${i}p")
  
  # Delete if name is empty or email is invalid
  if [ -z "$NAME" ] || [ "$NAME" == "null" ] || [ "$EMAIL" == "invalid-email" ]; then
    echo "  Deleting invalid lead: ID=$LEAD_ID, Name='$NAME', Email='$EMAIL'"
    curl -s -X DELETE "$BASE_URL/leads/$LEAD_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" > /dev/null
  fi
  
  i=$((i+1))
done

echo "✅ Cleanup complete!"