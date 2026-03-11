/**
 * @helixcrm/auth-core v0.1.0
 * Production-grade authentication core for HelixCRM
 * Main entry point - ALL EXPORTS HERE
 */

// Re-export everything from contracts
export * from './contracts/auth.contract';

// Re-export factory
export { createAuthCore } from './core/auth-core.factory';

// Re-export core services for advanced usage
export { JwtService } from './core/jwt.service';
export { PasswordService } from './core/password.service';
export { TokenManager } from './core/token-manager.service';

// Default export for convenience
import { createAuthCore } from './core/auth-core.factory';
export default { createAuthCore };
