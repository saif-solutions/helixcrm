# TEAM RULES (SIMPLE & ENFORCEABLE)
**Effective:** $(date +"%Y-%m-%d")
**For:** All team members (Product, Engineering, QA)

## Ì∫´ ABSOLUTE PROHIBITIONS
1. **No code in `/apps/` that belongs in `/packages/`**
   - If it's reusable, it's a package
   - If it's client-specific config, it's in `/configs/`

2. **No feature without config awareness**
   - Every feature must respect feature flags
   - Every UI element must support theming
   - Every string must have i18n key

3. **No UI string without i18n key**
   - Hardcoded strings block white-label deployments
   - Use translation keys from day one

4. **No client-specific logic in core**
   - Core = works for all clients
   - Client-specific = configuration or extension
   - If statement "if client == X" ‚Üí config flag

5. **No "temporary" code without an issue**
   - TODO comments must reference GitHub issue
   - Temporary fixes need expiration date
   - Tech debt tracked, not accumulated

## ‚úÖ MANDATORY PRACTICES
1. **Contract-First Development**
   - Tests before implementation
   - Contracts before refactoring

2. **SSOT Reference**
   - All PRs reference relevant SSOT sections
   - All decisions documented in DECISIONS.md

3. **Progressive Enhancement**
   - MVP first, polish later
   - Config-driven, not hardcoded
   - Feature flags for gradual rollout

## Ì¥ê ENFORCEMENT
- **PR Reviews**: Reject violations immediately
- **CI/CD**: Block merges that break contracts
- **Weekly Review**: Team lead audits for rule drift
- **Onboarding**: New members read this first

## ÌæØ PHILOSOPHY
These rules exist for one reason: **to keep the platform commercially viable**.
Every violation reduces our ability to:
- Sell modules independently
- Deploy white-label versions
- Onboard enterprise clients
- Scale the team safely

**Shortcuts today = blocked revenue tomorrow.**
