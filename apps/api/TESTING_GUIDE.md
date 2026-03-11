# Testing Guide - Enterprise Structure

## Test Taxonomy (4 Layers)

### 1. Unit Tests (`test/unit/`)

- **Purpose**: Test pure logic in isolation
- **Location**: `test/unit/{core,shared,modules}/`
- **Rules**: No DB, no HTTP, no external dependencies
- **Run**: `npm run test:unit`

### 2. Integration Tests (`test/integration/`)

- **Purpose**: Test module integration & guarantees
- **Location**: `test/integration/{auth,tenant-isolation,rls}/`
- **Rules**: Real DB, real NestJS app
- **Run**: `npm run test:integration`

### 3. Contract Tests (`tests/contracts/`)

- **Purpose**: Prevent breaking API consumers
- **Location**: `tests/contracts/{auth,api}/`
- **Rules**: Black-box, no internal imports
- **Run**: `npm run test:contracts`

### 4. Security Tests (`tests/security/`)

- **Purpose**: Prove security invariants
- **Rules**: Test negative scenarios, fail-fast assertions
- **Location**: `tests/security/{tenant-context,rls-enforcement}/`
- **Run**: `npm run test:security`

## Adding New Tests

### Unit Test Example:

```bash
# Create test file
touch test/unit/modules/auth/auth.service.spec.ts

# Follow pattern:
import { Test } from '@nestjs/testing';
import { AuthService } from '../../../src/modules/auth/auth.service';
Integration Test Example:
bash
# Create test file
touch test/integration/auth/login-flow.spec.ts

# Use test database with containers
CI/CD Integration
All tests run in CI:

test:unit - Required for merge

test:integration - Required for production

test:contracts - Required for release

test:security - Required for security review
```
