# HelixCRM Tests

## Test Classification

### Unit Tests

- **Location**: `./tests/unit/`
- **Purpose**: Test individual functions/modules in isolation
- **Scope**: Single package/component
- **Dependencies**: Mocked external services

### Integration Tests

- **Location**: `./tests/integration/`
- **Purpose**: Test interactions between modules
- **Scope**: Multiple packages/components
- **Dependencies**: Real services, test database

### Contract Tests

- **Location**: `./tests/contracts/`
- **Purpose**: Verify API contracts between modules
- **Scope**: Module boundaries
- **Dependencies**: API specifications

### E2E Tests

- **Location**: `./tests/e2e/`
- **Purpose**: Test complete user workflows
- **Scope**: Full application
- **Dependencies**: Full stack running

## Test Scripts

Shell scripts for testing are located in `/scripts/testing/`

## Running Tests

```bash
# Run MVP validation (e2e test)
./tests/e2e/test-mvp.sh

# Run authentication tests (integration)
./tests/integration/test-auth-simple.sh
Test Standards
All tests must be idempotent

Tests should clean up after themselves

Use test databases, not production

Include clear success/failure output
```
