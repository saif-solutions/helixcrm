#!/bin/bash

echo "Ì¥ç DEBUGGING Token Invalidation Issue"
echo "====================================="

# 1. Login
echo "1. Login to get first token..."
curl -c login.txt -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@helixcrm.test","password":"Admin123!"}' \
  -o /dev/null -s

TOKEN1=$(grep refresh_token login.txt | awk '{print $7}')
echo "   Token 1: ${TOKEN1:0:50}..."

# 2. Check what's in the database BEFORE refresh
echo ""
echo "2. Checking database state BEFORE refresh..."
# You can check with: npx prisma studio
echo "   Open another terminal and run: npx prisma studio"
echo "   Look at the refreshTokenHash field for admin user"

# 3. First refresh
echo ""
echo "3. Performing first refresh..."
curl -c refresh1.txt -b login.txt -X POST http://localhost:3001/api/v1/auth/refresh \
  -o /dev/null -s

TOKEN2=$(grep refresh_token refresh1.txt | awk '{print $7}')
echo "   Token 2: ${TOKEN1:0:50}..."

# 4. Check database AFTER refresh
echo ""
echo "4. Database should now have NEW hash..."
echo "   Check Prisma Studio again"

# 5. Critical test: Try old token with NO cookies file
echo ""
echo "5. Testing with raw HTTP (no cookie file)..."
echo "   Making direct POST with old token in body..."
OLD_RESULT=$(curl -s -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\": \"$TOKEN1\"}")
  
echo "   Response: ${OLD_RESULT:0:100}..."

# 6. Check the actual code logic
echo ""
echo "6. Checking auth.service.ts logic..."
echo "   The issue is in refreshToken method:"
echo "   - We compare old token with user.refreshTokenHash"
echo "   - We generate new token and hash"
echo "   - We update user.refreshTokenHash with new hash"
echo "   BUT old token might still validate if:"
echo "   1. Database update is failing"
echo "   2. We're comparing wrong field"
echo "   3. Transaction issue"

# Cleanup
rm -f login.txt refresh1.txt

echo ""
echo "====================================="
echo "Run: npx prisma studio to see database"
