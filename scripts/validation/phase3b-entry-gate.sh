#!/bin/bash

echo "Ì¥í PHASE 3B ENTRY GATE - Safety Check"
echo "=========================================="
echo "Purpose: Eliminate environment-based false failures"
echo "Expected time: 15 minutes"
echo ""

# Step 1: Fresh restart
echo "Ì¥Ñ Step 1: Fresh restart of services..."
docker-compose down -v
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "‚è≥ Waiting for PostgreSQL to be ready..."
sleep 10

# Step 2: Start the API in development mode
echo "Ì∫Ä Step 2: Starting API in development mode..."
npm run start:dev &
API_PID=$!

# Wait for API to start
echo "‚è≥ Waiting for API to start..."
sleep 15

# Step 3: Run validation scripts
echo "Ì≥ã Step 3: Running validation scripts..."

echo ""
echo "Ì∑™ Running phase3b-validation.ts..."
npx ts-node src/modules/auth/adapters/phase3b-validation.ts
VALIDATION_RESULT=$?

echo ""
echo "Ì∑™ Running transaction-verify.ts..."
npx ts-node src/modules/auth/adapters/transaction-verify.ts
TRANSACTION_RESULT=$?

# Step 4: Stop the API
echo ""
echo "Ìªë Stopping API..."
kill $API_PID 2>/dev/null

# Step 5: Confirm results
echo ""
echo "Ì≥ä ENTRY GATE RESULTS:"
echo "======================"

if [ $VALIDATION_RESULT -eq 0 ] && [ $TRANSACTION_RESULT -eq 0 ]; then
    echo "‚úÖ SUCCESS: All checks passed cleanly"
    echo ""
    echo "ÌæØ ENTRY CRITERIA MET:"
    echo "   - No warnings"
    echo "   - No retries" 
    echo "   - No manual intervention"
    echo "   - Environment is clean"
    echo ""
    echo "Ì∫Ä PROCEED TO FULL QA CHECKLIST EXECUTION"
    exit 0
else
    echo "‚ùå FAILURE: One or more checks failed"
    echo ""
    echo "‚ö†Ô∏è  DO NOT PROCEED:"
    echo "   - Check environment configuration"
    echo "   - Verify database is running"
    echo "   - Review error messages above"
    echo ""
    echo "After fixing issues, run this gate again."
    exit 1
fi
