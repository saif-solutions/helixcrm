#!/bin/bash

echo "��� Phase 2 Security Enhancement Verification"
echo "=========================================="

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}1. Checking new files...${NC}"
if [ -f "apps/api/src/config/security.config.ts" ]; then
    echo -e "${GREEN}✅ security.config.ts created${NC}"
else
    echo -e "${RED}❌ security.config.ts missing${NC}"
fi

echo -e "\n${YELLOW}2. Checking auth.service.ts updates...${NC}"
if grep -q "refreshTokenHash" apps/api/src/modules/auth/auth.service.ts; then
    echo -e "${GREEN}✅ refreshTokenHash implemented${NC}"
else
    echo -e "${RED}❌ refreshTokenHash not found${NC}"
fi

if grep -q "SecurityConfig" apps/api/src/modules/auth/auth.service.ts; then
    echo -e "${GREEN}✅ Using centralized security config${NC}"
else
    echo -e "${RED}❌ Not using centralized config${NC}"
fi

echo -e "\n${YELLOW}3. Checking TypeScript compilation...${NC}"
cd apps/api
if npx tsc --noEmit; then
    echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
else
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    exit 1
fi

echo -e "\n${YELLOW}4. Checking schema...${NC}"
if npx prisma validate; then
    echo -e "${GREEN}✅ Prisma schema is valid${NC}"
else
    echo -e "${RED}❌ Prisma schema validation failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}=========================================="
echo "✅ Phase 2 Verification Complete!"
echo ""
echo "Next steps:"
echo "1. Restart backend: npm run start:dev"
echo "2. Run seed: npm run prisma:seed"
echo "3. Test login/logout/refresh flows"
echo "==========================================${NC}"
