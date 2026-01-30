# SILENT ASSUMPTIONS SCAN
**Scan Date:** $(date +"%Y-%m-%d")
**Purpose:** Identify landmines before modularization

## Ì¥ç Findings

### 1. Hardcoded Tenant/Organization Assumptions
- **Location**: Multiple `organizationId` checks without config
- **Risk**: Breaks multi-client white-label deployments
- **Action**: Externalize to config, add tenant context middleware

### 2. Default Language Assumptions
- **Location**: UI strings hardcoded in English
- **Risk**: i18n implementation blocked
- **Action**: Convert to i18n keys, add fallback strategy

### 3. Theme/Layout Assumptions
- **Location**: CSS with light-mode assumptions
- **Risk**: Dark mode requires major refactor
- **Action**: Convert to CSS variables, theme tokens

### 4. Role/Permission Assumptions
- **Location**: Hardcoded "admin" role checks
- **Risk**: Cannot customize RBAC per client
- **Action**: Externalize to config, permission service

### 5. Data Structure Assumptions
- **Location**: Fixed contact/deal schema
- **Risk**: Client-specific fields impossible
- **Action**: Design extensible data model

## ÌæØ Immediate Actions (Before Major Refactoring)
1. Audit all hardcoded IDs/emails in test data
2. Convert top 10 UI strings to i18n keys
3. Create theme token foundation
4. Document current RBAC assumptions

## Ì≥Å Tracking
These findings are tracked in:
- `DECISIONS.md` for architectural responses
- GitHub Issues for implementation tasks
- Team backlog for prioritization

**Note**: Not all need fixing now - just awareness prevents blocking surprises.
