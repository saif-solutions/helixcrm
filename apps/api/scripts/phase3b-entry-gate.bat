@echo off
echo Ì¥í PHASE 3B ENTRY GATE - Safety Check
echo ==========================================
echo Purpose: Eliminate environment-based false failures
echo Expected time: 15 minutes
echo.

echo Ì¥Ñ Step 1: Fresh restart of services...
docker-compose down -v
docker-compose up -d postgres

echo ‚è≥ Waiting for PostgreSQL to be ready...
timeout /t 10 /nobreak > nul

echo Ì∫Ä Step 2: Starting API in development mode...
start /B npm run start:dev

echo ‚è≥ Waiting for API to start...
timeout /t 15 /nobreak > nul

echo.
echo Ì∑™ Running phase3b-validation.ts...
npx ts-node src/modules/auth/adapters/phase3b-validation.ts
if errorlevel 1 (
    echo ‚ùå phase3b-validation.ts failed
    goto failure
)

echo.
echo Ì∑™ Running transaction-verify.ts...
npx ts-node src/modules/auth/adapters/transaction-verify.ts
if errorlevel 1 (
    echo ‚ùå transaction-verify.ts failed
    goto failure
)

echo.
echo Ì≥ä ENTRY GATE RESULTS:
echo ======================
echo ‚úÖ SUCCESS: All checks passed cleanly
echo.
echo ÌæØ ENTRY CRITERIA MET:
echo    - No warnings
echo    - No retries
echo    - No manual intervention
echo    - Environment is clean
echo.
echo Ì∫Ä PROCEED TO FULL QA CHECKLIST EXECUTION
exit /b 0

:failure
echo.
echo ‚ùå FAILURE: One or more checks failed
echo.
echo ‚ö†Ô∏è  DO NOT PROCEED:
echo    - Check environment configuration
echo    - Verify database is running
echo    - Review error messages above
echo.
echo After fixing issues, run this gate again.
exit /b 1
