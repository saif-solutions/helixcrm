#!/bin/bash

echo "🔒 Phase 2 Security Enhancement Verification"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}1. Checking new security.config.ts...${NC}"
if [ -f "apps/api/src/config/security.config.ts" ]; then
    echo -e "${GREEN}✅ security.config.ts created${NC}"
    
    # Check key configurations
    if grep -q "refreshTokenHash" apps/api/src/config/security.config.ts; then
        echo -e "${GREEN}✅ Refresh token hashing configured${NC}"
    fi
    
    if grep -q "rotationEnabled" apps/api/src/config/security.config.ts; then
        echo -e "${GREEN}✅ Token rotation configured${NC}"
    fi
else
    echo -e "${RED}❌ security.config.ts missing${NC}"
fi

echo -e "\n${YELLOW}2. Checking auth.service.ts updates...${NC}"
if grep -q "refreshTokenHash" apps/api/src/modules/auth/auth.service.ts; then
    echo -e "${GREEN}✅ Refresh token hashing implemented${NC}"
else
    echo -e "${RED}❌ Refresh token hashing not implemented${NC}"
fi

if grep -q "SecurityConfig" apps/api/src/modules/auth/auth.service.ts; then
    echo -e "${GREEN}✅ Using centralized security config${NC}"
else
    echo -e "${RED}❌ Not using centralized config${NC}"
fi

echo -e "\n${YELLOW}3. Checking Prisma schema updates...${NC}"
if grep -q "refreshTokenHash" apps/api/prisma/schema.prisma; then
    echo -e "${GREEN}✅ refreshTokenHash field added to schema${NC}"
else
    echo -e "${RED}❌ Schema not updated${NC}"
fi

if grep -q "refreshTokenIssuedAt" apps/api/prisma/schema.prisma; then
    echo -e "${GREEN}✅ refreshTokenIssuedAt field added${NC}"
else
    echo -e "${RED}❌ refreshTokenIssuedAt missing${NC}"
fi

echo -e "\n${YELLOW}4. Checking cookie.utils.ts updates...${NC}"
if grep -q "SecurityConfig" apps/api/src/shared/auth/cookie.utils.ts; then
    echo -e "${GREEN}✅ cookie.utils uses centralized config${NC}"
else
    echo -e "${RED}❌ cookie.utils not updated${NC}"
fi

echo -e "\n${YELLOW}5. Checking CSRF middleware updates...${NC}"
if grep -q "SecurityConfig" apps/api/src/shared/security/csrf.middleware.ts; then
    echo -e "${GREEN}✅ CSRF middleware uses centralized config${NC}"
else
    echo -e "${RED}❌ CSRF middleware not updated${NC}"
fi

echo -e "\n${YELLOW}6. Checking seed file updates...${NC}"
if grep -q "refreshTokenHash" apps/api/prisma/seed.ts; then
    echo -e "${GREEN}✅ Seed file updated for new schema${NC}"
else
    echo -e "${RED}❌ Seed file not updated${NC}"
fi

echo -e "\n${GREEN}=========================================="
echo "Verification Complete"
echo "Next steps:"
echo "1. Run database migration: npx prisma migrate dev"
echo "2. Restart backend"
echo "3. Test login/logout/refresh flows"
echo "==========================================${NC}"