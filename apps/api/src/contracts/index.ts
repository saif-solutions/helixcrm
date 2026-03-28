/**
 * Contracts Directory
 *
 * This directory contains all domain contracts (DTOs, Interfaces, Types)
 * following Domain-Driven Design principles.
 *
 * Structure:
 * - auth/      - Authentication domain contracts
 * - user/      - User management domain contracts
 * - tenant/    - Tenant management domain contracts
 * - audit/     - Audit logging domain contracts
 * - shared/    - Contracts shared across domains
 */

// Auth Domain
export * from './auth';

// User Domain
export * from './user';

// Tenant Domain
export * from './tenant';

// Audit Domain
export * from './audit';

// Shared Contracts
export * from './shared';
