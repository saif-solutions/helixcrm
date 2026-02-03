#!/bin/bash
echo "Current package.json test section (if any):"
grep -A 5 -B 5 "test" apps/api/package.json || echo "No test scripts found"

echo ""
echo "Recommended test scripts to add:"
cat << 'TESTSCRIPTS'
  "scripts": {
    "test:unit": "jest apps/api/test/unit --coverage",
    "test:integration": "jest apps/api/test/integration --runInBand",
    "test:contracts": "jest tests/contracts --runInBand",
    "test:security": "jest tests/security --runInBand",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:contracts && npm run test:security",
    "test": "npm run test:unit"
  }
TESTSCRIPTS
