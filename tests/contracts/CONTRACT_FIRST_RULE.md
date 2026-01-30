# CONTRACT-FIRST RULE (SACRED)

## The Rule
**Before ANY module boundary change, contract tests MUST be written first.**

## Workflow
1. Identify boundary change needed
2. Write/update contract test in `/tests/contracts/`
3. Make contract test pass with current implementation
4. Refactor/modify implementation
5. Contract test continues to pass

## What Constitutes a Boundary Change
- API endpoint signature changes
- Module interface modifications  
- Data format alterations
- Error response format changes
- Authentication/authorization requirements

## Enforcement
- CI/CD blocks merge if contract tests fail
- Code review rejects PRs without contract tests
- Team lead reviews all contract test changes

## Why This Matters
Contract tests protect:
- White-label client deployments
- Commercial module sales
- Team velocity during refactoring
- Enterprise client confidence

## Example Contract Test
```typescript
// tests/contracts/auth/authentication.spec.ts
describe('Authentication Contract', () => {
  it('should return JWT with user context', async () => {
    const response = await authenticate({ email, password });
    expect(response).toHaveProperty('accessToken');
    expect(response).toHaveProperty('refreshToken');
    expect(response.user).toHaveProperty('organizationId');
  });
});
