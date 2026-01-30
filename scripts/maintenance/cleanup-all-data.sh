#!/bin/bash

echo "🧹 Emergency Data Cleanup"
echo "========================"

BASE_URL="http://localhost:3001/api/v1"
EMAIL="testuser@example.com"
PASSWORD="Test123!"

# Test server connectivity
echo "Testing server connection..."
if ! curl -s --head "$BASE_URL/health" > /dev/null; then
  echo "❌ Server not responding at $BASE_URL"
  echo "Please start the server first: npm run start:dev"
  exit 1
fi

# Try to login or register
echo "Attempting authentication..."

# First try login
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
  echo "✅ Logged in successfully"
else
  echo "⚠️ Login failed, trying to register..."
  
  # Register new user
  REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"firstName\":\"Cleanup\",\"lastName\":\"User\",\"organizationName\":\"Cleanup Org\"}")
  
  if echo "$REGISTER_RESPONSE" | grep -q '"id"'; then
    echo "✅ Registered new user"
    
    # Now login with new user
    LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
    
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    echo "✅ Logged in with new user"
  else
    echo "❌ Failed to register or login"
    echo "Register response: $REGISTER_RESPONSE"
    exit 1
  fi
fi

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ No access token obtained"
  exit 1
fi

echo "🔍 Fetching existing data..."

# Get all leads
LEADS_RESPONSE=$(curl -s -X GET "$BASE_URL/leads" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [ $? -ne 0 ]; then
  echo "❌ Failed to fetch leads"
  exit 1
fi

# Extract and count leads
LEAD_IDS=$(echo "$LEADS_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
LEAD_COUNT=$(echo "$LEAD_IDS" | wc -w)
echo "Found $LEAD_COUNT leads"

# Delete all leads
if [ "$LEAD_COUNT" -gt 0 ]; then
  echo "🗑️ Deleting all leads..."
  for LEAD_ID in $LEAD_IDS; do
    echo "  Deleting lead: $LEAD_ID"
    curl -s -X DELETE "$BASE_URL/leads/$LEAD_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" > /dev/null
  done
  echo "✅ All leads deleted"
else
  echo "✅ No leads to delete"
fi

# Get all contacts
CONTACTS_RESPONSE=$(curl -s -X GET "$BASE_URL/contacts" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

# Extract and count contacts
CONTACT_IDS=$(echo "$CONTACTS_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
CONTACT_COUNT=$(echo "$CONTACT_IDS" | wc -w)
echo "Found $CONTACT_COUNT contacts"

# Delete all contacts
if [ "$CONTACT_COUNT" -gt 0 ]; then
  echo "🗑️ Deleting all contacts..."
  for CONTACT_ID in $CONTACT_IDS; do
    echo "  Deleting contact: $CONTACT_ID"
    curl -s -X DELETE "$BASE_URL/contacts/$CONTACT_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" > /dev/null
  done
  echo "✅ All contacts deleted"
else
  echo "✅ No contacts to delete"
fi

echo ""
echo "🎉 Cleanup complete!"
echo "Database is now clean for testing."