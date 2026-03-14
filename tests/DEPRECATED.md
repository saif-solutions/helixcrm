# Deprecated Test Patterns

## DO NOT USE
- `Test.createTestingModule()` for unit tests
- Relative imports like `../../../../`
- Manual mock creation in each test file

## Use Instead
- Direct class instantiation
- Imports from `__mocks__`, `__utils__`, `__factories__`
- Global mocks from `jest.setup.ts`

## Migration Status

| Test Type | Status | Target Date |
|-----------|--------|-------------|
| Guards | ✅ Migrated | 2026-03-15 |
| Services | ⏳ In Progress | 2026-03-20 |
| Controllers | ⏳ Pending | 2026-03-25 |
| Integration | ⏳ Pending | 2026-03-30 |

## Cleanup Tasks
- [ ] Remove old helper files after migration
- [ ] Update CI scripts
- [ ] Update documentation