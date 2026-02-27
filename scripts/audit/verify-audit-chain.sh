#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}í´ HelixCRM Audit Chain Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Node is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}âŒ Node.js is not installed or not in PATH${NC}"
    exit 1
fi

# Change to the correct directory - the API directory
cd "$(dirname "$0")/../.."  # Go from scripts/audit-integrity to apps/api

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}âŒ Not in the API directory. Current directory: $(pwd)${NC}"
    exit 1
fi

echo -e "${YELLOW}í³Š Running audit chain verification...${NC}"
echo "Current directory: $(pwd)"
echo ""

# First, let's run the migration to ensure tables exist
echo -e "${BLUE}í´§ Checking database tables...${NC}"
if command -v npx &> /dev/null; then
    echo "Running Prisma migration..."
    npx prisma migrate deploy
else
    echo "âš ï¸  npx not available, skipping migration check"
fi

echo ""

# Run the TypeScript file directly with ts-node
echo -e "${BLUE}íº€ Starting verification...${NC}"
echo ""

# Create a simple Node.js runner script
cat > /tmp/audit-verify-runner.js << 'RUNNER_EOF'
const { spawn } = require('child_process');
const path = require('path');

const command = 'npx';
const args = [
  'ts-node',
  '-r',
  'tsconfig-paths/register',
  path.join(__dirname, 'src/shared/audit-integrity/commands/verify-audit-chain.command.ts')
];

console.log('Running:', command, args.join(' '));

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

child.on('close', (code) => {
  process.exit(code);
});

child.on('error', (error) => {
  console.error('Failed to start verification:', error);
  process.exit(1);
});
RUNNER_EOF

# Run the verification
node /tmp/audit-verify-runner.js

EXIT_CODE=$?

# Clean up
rm -f /tmp/audit-verify-runner.js

echo ""
echo -e "${BLUE}í³‹ Verification complete at: $(date)${NC}"
echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}âœ… Audit integrity check passed!${NC}"
    
    # Log success
    LOG_DIR="$(pwd)/logs"
    mkdir -p "$LOG_DIR"
    echo "$(date '+%Y-%m-%d %H:%M:%S'): Audit chain verification SUCCESS" >> "$LOG_DIR/audit-integrity.log"
    
    exit 0
else
    echo -e "${RED}âŒ Audit integrity check failed!${NC}"
    
    # Log failure
    LOG_DIR="$(pwd)/logs"
    mkdir -p "$LOG_DIR"
    echo "$(date '+%Y-%m-%d %H:%M:%S'): Audit chain verification FAILED (exit code: $EXIT_CODE)" >> "$LOG_DIR/audit-integrity.log"
    
    exit $EXIT_CODE
fi
