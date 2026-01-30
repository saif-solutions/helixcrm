#!/bin/bash

echo "Ì¥ç Verifying CSRF Hardening Implementation"
echo "=========================================="

echo "1. Checking CSRF Middleware..."
if grep -q "ignoreMethods: \['GET', 'HEAD', 'OPTIONS'\]" apps/api/src/shared/security/csrf.middleware.ts; then
    echo "‚úÖ ignoreMethods configured"
else
    echo "‚ùå ignoreMethods missing"
fi

echo ""
echo "2. Checking Auth Controller..."
if ! grep -q "'development-mode'" apps/api/src/modules/auth/auth.controller.ts; then
    echo "‚úÖ 'development-mode' removed"
else
    echo "‚ùå Still has 'development-mode'"
fi

if grep -q "BadRequestException" apps/api/src/modules/auth/auth.controller.ts; then
    echo "‚úÖ BadRequestException added for error handling"
else
    echo "‚ùå BadRequestException missing"
fi

echo ""
echo "3. Checking App Module..."
if grep -q "apply(CsrfMiddleware)" apps/api/src/app.module.ts && \
   ! grep -q "exclude.*csrf-token" apps/api/src/app.module.ts; then
    echo "‚úÖ CSRF middleware applied to all routes"
else
    echo "‚ùå App module not properly configured"
fi

echo ""
echo "Ìæâ Verification complete!"
