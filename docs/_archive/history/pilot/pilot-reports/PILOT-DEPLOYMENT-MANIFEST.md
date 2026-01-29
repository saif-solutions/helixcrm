# HELIXCRM MVP PILOT DEPLOYMENT MANIFEST
## Deployment Date: 2026-01-06
## Environment: TEST/PILOT
## Scope: 2-3 trusted users

## SERVICES
- API Server: http://localhost:3000
- Frontend: http://localhost:5173  
- Database: PostgreSQL (localhost:5432)
- Logging: Winston to files

## SECURITY CONFIGURATION
- Token Expiration: 15 minutes
- Rate Limiting: Enabled (5 logins/min, 3 registrations/min)
- Tenant Isolation: Application-level enforced
- Token Version Validation: ✅ WORKING
- CORS: Enabled for frontend origin

## TESTED USER CREDENTIALS
1. User A: user_a@test.com / TestPass123!
2. User B: user_b@test.com / TestPass123!  
3. Admin: admin@test.com / TestPass123!

## KNOWN LIMITATIONS (MVP)
1. No database-level RLS
2. No advanced RBAC
3. No email/SMS integration
4. Basic error handling only
5. localStorage token storage (XSS vulnerable)

## MONITORING
- Logs: apps/api/logs/combined.log
- Errors: apps/api/logs/error.log
- Health: http://localhost:3000/health

## SUCCESS CRITERIA (PILOT)
1. Users can login/logout
2. Contacts CRUD works
3. No tenant data leakage
4. Logs capture all operations
5. No critical errors in production

## ROLLBACK PROCEDURE
1. Stop all services
2. Restore database from backup (if any)
3. Revert to git tag: mvp-foundation-complete

## CONTACT FOR ISSUES
- Technical: Development Team
- Security: Security Channel
- User Support: Pilot Users Direct
