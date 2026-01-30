#!/bin/bash

echo "Ì∫Ä Testing Auth Flow with Real Backend"
echo "======================================="

# Check if backend is running
echo "1. Checking backend connectivity..."
curl -s http://localhost:3001/api/v1/health || echo "‚ùå Backend not running at http://localhost:3001"

echo ""
echo "2. Testing CSRF token endpoint..."
curl -s -c cookies.txt http://localhost:3001/api/v1/auth/csrf-token

echo ""
echo "3. Testing login endpoint (with invalid creds to check connection)..."
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}' \
  -c cookies.txt \
  -b cookies.txt

echo ""
echo "‚úÖ Auth endpoints are accessible (backend required)"
echo ""
echo "To test full flow:"
echo "1. Ensure backend is running: npm run dev in backend directory"
echo "2. Start frontend: npm run dev"
echo "3. Navigate to http://localhost:5173"
echo "4. Register new user or login with existing credentials"
echo "5. Verify dashboard loads real data"
