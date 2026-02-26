#!/bin/bash
echo "=== GATE 1: AUTHENTICATION INTEGRITY TEST ==="
echo ""

# Create test directory
mkdir -p test-gates
cd test-gates

echo "1. Checking if API is running..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ API is running"
else
    echo "❌ API is not running. Start with: cd apps/api && npm run start:dev"
    exit 1
fi

echo ""
echo "2. Testing will verify:"
echo "   - Token version invalidation (DB change → 401)"
echo "   - Frontend handles 401 correctly"
echo "   - No token leakage in logs"
echo "   - Storage strategy documented"
echo ""
echo "Please ensure:"
echo "1. API is running (http://localhost:3000)"
echo "2. Database is accessible"
echo "3. You have test user credentials"
echo ""
echo "Run specific tests manually:"
echo "- Change tokenVersion in DB, try API call"
echo "- Check logs for token exposure"
echo "- Test frontend logout on 401"
