#!/bin/bash

echo "��� QUICK SECURITY AUDIT CHECKLIST"
echo "=================================="

echo -e "\n1. CSRF PROTECTION VERIFICATION"
echo "----------------------------------"

echo -e "\na) CSRF token endpoint (should return token):"
CSRF_RESPONSE=$(curl -s http://localhost:3001/api/v1/auth/csrf-token)
if echo "$CSRF_RESPONSE" | grep -q "csrfToken"; then
    echo "   ✅ CSRF token endpoint working"
    CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
    echo "   Token: ${CSRF_TOKEN:0:15}..."
else
    echo "   ❌ CSRF endpoint failed"
fi

echo -e "\nb) CSRF protection on POST endpoint (should fail without token):"
echo "   Testing POST /contacts without CSRF token..."
NO_CSRF_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/contacts \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@test.com"}')

if echo "$NO_CSRF_RESPONSE" | grep -q "403\|CSRF\|Forbidden"; then
    echo "   ✅ CSRF protection active (correctly rejected)"
else
    echo "   ⚠️  Response: ${NO_CSRF_RESPONSE:0:100}"
fi

echo -e "\nc) CSRF protection with token (should still fail without auth):"
if [ -n "$CSRF_TOKEN" ]; then
    WITH_CSRF_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/contacts \
      -H "Content-Type: application/json" \
      -H "X-CSRF-Token: $CSRF_TOKEN" \
      -d '{"firstName":"Test","lastName":"User","email":"test@test.com"}')
    
    if echo "$WITH_CSRF_RESPONSE" | grep -q "401\|Unauthorized"; then
        echo "   ✅ CSRF accepted, auth required (correct flow)"
    else
        echo "   Response with CSRF: ${WITH_CSRF_RESPONSE:0:100}"
    fi
fi

echo -e "\n2. COOKIE SECURITY HEADERS"
echo "----------------------------"

echo -e "\na) Checking login response headers..."
LOGIN_HEADERS=$(curl -s -i -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@helixcrm.test","password":"Admin123!"}' 2>/dev/null | grep -i "set-cookie")

echo "$LOGIN_HEADERS" | while read line; do
    if echo "$line" | grep -q "HttpOnly"; then
        echo "   ✅ HttpOnly flag present"
    else
        echo "   ⚠️  Missing HttpOnly flag"
    fi
    
    if echo "$line" | grep -q "SameSite"; then
        echo "   ✅ SameSite attribute present"
    else
        echo "   ⚠️  Missing SameSite attribute"
    fi
done

echo -e "\n3. SECURITY HTTP HEADERS"
echo "--------------------------"

echo -e "\na) Checking security headers on health endpoint:"
HEADERS=$(curl -s -i http://localhost:3001/api/v1/health 2>/dev/null)

HEADER_CHECKS=0
if echo "$HEADERS" | grep -q "X-Request-ID"; then
    echo "   ✅ X-Request-ID present"
    HEADER_CHECKS=$((HEADER_CHECKS+1))
fi

if echo "$HEADERS" | grep -q "Content-Security-Policy"; then
    echo "   ✅ Content-Security-Policy present"
    HEADER_CHECKS=$((HEADER_CHECKS+1))
fi

if echo "$HEADERS" | grep -q "X-Content-Type-Options"; then
    echo "   ✅ X-Content-Type-Options present"
    HEADER_CHECKS=$((HEADER_CHECKS+1))
fi

if echo "$HEADERS" | grep -q "X-Frame-Options"; then
    echo "   ✅ X-Frame-Options present"
    HEADER_CHECKS=$((HEADER_CHECKS+1))
fi

if [ $HEADER_CHECKS -ge 3 ]; then
    echo "   ✅ Good security headers coverage"
else
    echo "   ⚠️  Only $HEADER_CHECKS/4 security headers found"
fi

echo -e "\n4. TOKEN INVALIDATION TEST"
echo "---------------------------"

echo -e "\na) Running token rotation test..."
if [ -f "./test-token-invalidation.sh" ]; then
    ./test-token-invalidation.sh 2>&1 | tail -20
    TOKEN_RESULT=$?
    if [ $TOKEN_RESULT -eq 0 ]; then
        echo "   ✅ Token invalidation test passed"
    else
        echo "   ❌ Token invalidation test failed"
    fi
else
    echo "   Test script not found at ./test-token-invalidation.sh"
fi

echo -e "\n5. AUTHENTICATION FLOW"
echo "-----------------------"

echo -e "\na) Testing login → refresh → logout flow..."
echo "   (This requires manual testing with browser/devtools)"
echo "   Steps to test manually:"
echo "   1. Login and check cookies are set"
echo "   2. Verify refresh token rotation works"
echo "   3. Logout and verify tokens are cleared"
echo "   4. Try to use old tokens (should fail)"

echo -e "\n��� AUDIT SUMMARY"
echo "================"
echo "Run each check above and look for ✅ marks"
echo "Any ⚠️ or ❌ requires investigation"
echo ""
echo "Key items to verify manually:"
echo "1. Browser DevTools: Cookies should have HttpOnly, Secure flags"
echo "2. Network tab: X-CSRF-Token header on POST/PUT/DELETE"
echo "3. Console: No CORS or CSRF errors"
echo "4. LocalStorage: Should contain csrf_token"
