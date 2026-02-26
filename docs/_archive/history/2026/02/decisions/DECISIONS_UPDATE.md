# Decisions to Append to DECISIONS.md

## Important: Check for Decision 8 duplication
Before adding these, check if Decision 8 already exists twice in DECISIONS.md.
If yes, remove the duplicate before appending.

---

## Decision 9: Auth Core Versioning Strategy
**Date**: $(date +"%Y-%m-%d")  
**Decision**: Auth-core package starts at version 0.1.0 with explicit experimental status.  
**Context**: Need to signal internal iteration freedom during MVP-1 while establishing package pattern.  
**Consequences**:
- ✅ 0.1.0 signals "experimental but intentional"
- ✅ No backward compatibility pressure during MVP-1
- ✅ Clear upgrade path to 1.0.0 post-stabilization
- ✅ Prevents premature API freeze
**Status**: ✅ Active

## Decision 10: MVP Auth Surface Area
**Date**: $(date +"%Y-%m-%d")  
**Decision**: Auth-core v0.1 implements minimal viable authentication surface only.  
**Context**: Keeping extraction focused and fast for MVP-1 foundation.  
**Consequences**:
- ✅ Faster extraction (focus on essentials)
- ✅ Lower risk during refactoring
- ✅ Advanced features explicitly deferred
- ✅ Clear "MVP Auth" definition established
**Status**: ✅ Active

## Decision 11: Contract Test Structure
**Date**: $(date +"%Y-%m-%d")  
**Decision**: Contract tests separated into definition (types) and verification (executable tests).  
**Context**: TypeScript interfaces alone don't prevent behavior drift; executable tests are required.  
**Consequences**:
- ✅ Contract definitions in package (`/packages/auth-core/src/contracts/`)
- ✅ Contract verification in tests (`/tests/contracts/auth/`)
- ✅ Behavior preservation guaranteed
- ✅ Clear separation of concerns
**Status**: ✅ Active

## Decision 12: Module Extraction Sequence Enforcement
**Date**: $(date +"%Y-%m-%d")  
**Decision**: Auth-core extraction must be completed and validated before any other module extraction begins.  
**Context**: Parallel extraction causes integration complexity and boundary confusion.  
**Consequences**:
- ✅ Sequential validation of extraction pattern
- ✅ Lessons from auth-core inform subsequent extractions
- ✅ Reduced risk of cross-module dependencies
- ✅ Clear completion criteria for each module
**Status**: ✅ LOCKED - No deviation without Product Owner approval

---

## Instructions for Integration:
1. Open DECISIONS.md
2. Remove any duplicate Decision 8 entries (keep only one)
3. Append these new decisions (9-12) before the "How to Use This Log" section
4. Update the decision count in any summary if present
5. Commit with message: "feat: Add MVP-1 auth extraction decisions"