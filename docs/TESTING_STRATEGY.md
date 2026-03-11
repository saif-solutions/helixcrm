# Enterprise Test Strategy - 4 Layer Taxonomy

## Overview

Based on CTO review, we implement a 4-layer test taxonomy for enterprise-grade reliability.

## Layer 1: Unit Tests (`apps/api/test/unit/`)

- **Purpose**: Test pure logic in isolation
- **Location**: `unit/{core,shared,modules}/`
- **Rules**: No DB, no HTTP, no external dependencies
- **Command**: `npm run test:unit`
- **Examples**: Business logic, validation, pure functions

## Layer 2: Integration Tests (`apps/api/test/integration/`)

- **Purpose**: Test module integration & guarantees
- **Location**: `integration/{auth,tenant-isolation,rls}/`
- **Rules**: Real DB, real NestJS app, containerized
- **Command**: `npm run test:integration`
- **Examples**: Auth flows, tenant isolation, RLS enforcement

## Layer 3: Contract Tests (`tests/contracts/`)

- **Purpose**: Prevent breaking API consumers
- **Location**: `contracts/{auth,api}/`
- **Rules**: Black-box, no internal imports, API stability
- **Command**: `npm run test:contracts`
- **Examples**: API shape validation, error contracts

## Layer 4: Security Tests (`tests/security/`)

- **Purpose**: Prove security invariants
- **Location**: `security/{tenant-context,rls-enforcement}/`
- **Rules**: Negative scenarios, fail-fast assertions
- **Command**: `npm run test:security`
- **Examples**: Missing tenant context, RLS bypass attempts

## CI/CD Gates

- **Pre-merge**: `test:unit` + lint
- **Pre-release**: `test:integration` + `test:contracts`
- **Security Review**: `test:security`

## Adding New Tests

1. Unit tests co-located with source (moved to test/unit/)
2. Integration tests for cross-module behavior
3. Contract tests for public APIs
4. Security tests for invariants
