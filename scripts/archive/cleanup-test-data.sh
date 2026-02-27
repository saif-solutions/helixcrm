#!/bin/bash

echo "🧹 Cleaning up test data..."

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

# Get all leads and delete them
echo "Deleting test leads..."
LEADS_RESPONSE=$(curl -s -X GET "$BASE_URL/leads" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

LEAD_IDS=$(echo "$LEADS_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

for LEAD_ID in $LEAD_IDS; do
  echo "  Deleting lead: $LEAD_ID"
  curl -s -X DELETE "$BASE_URL/leads/$LEAD_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" > /dev/null
done

# Get all contacts and delete them
echo "Deleting test contacts..."
CONTACTS_RESPONSE=$(curl -s -X GET "$BASE_URL/contacts" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

CONTACT_IDS=$(echo "$CONTACTS_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

for CONTACT_ID in $CONTACT_IDS; do
  echo "  Deleting contact: $CONTACT_ID"
  curl -s -X DELETE "$BASE_URL/contacts/$CONTACT_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" > /dev/null
done

echo "✅ Cleanup complete!"