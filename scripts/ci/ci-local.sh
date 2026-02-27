#!/bin/bash
set -e

echo "Ì∫Ä Running Local CI Simulation - 4 Layer Testing"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run command with status
run_step() {
    local step_name="$1"
    local command="$2"
    
    echo -e "\n${YELLOW}‚ñ∂ ${step_name}...${NC}"
    if eval "$command"; then
        echo -e "${GREEN}‚úÖ ${step_name} passed${NC}"
        return 0
    else
        echo -e "${RED}‚ùå ${step_name} failed${NC}"
        return 1
    fi
}

# Change to API directory
cd apps/api

echo -e "\n${YELLOW}=== LAYER 1: Quality Gates ===${NC}"

# Step 1: Type Check
run_step "Type Check" "npx tsc --noEmit"

# Step 2: Unit Tests
run_step "Unit Tests" "npm run test:unit -- --coverage"

echo -e "\n${YELLOW}=== LAYER 2: Integration Tests (Requires DB) ===${NC}"
echo "Note: Integration tests need PostgreSQL running locally"
echo "Run with: docker-compose -f ../docker/docker-compose.yml up -d postgres"
read -p "Run integration tests? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_step "Integration Tests" "npm run test:integration"
fi

echo -e "\n${YELLOW}=== LAYER 3: Contract Tests ===${NC}"
run_step "Contract Tests" "npm run test:contracts"

echo -e "\n${YELLOW}=== LAYER 4: Security Tests ===${NC}"
run_step "Security Tests" "npm run test:security"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}‚úÖ Local CI Simulation Complete${NC}"
echo -e "${GREEN}========================================${NC}"

# Return to original directory
cd ../..
