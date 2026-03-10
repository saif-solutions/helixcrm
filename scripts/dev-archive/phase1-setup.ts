#!/usr/bin/env ts-node
// Phase 1 Development Environment Setup Script

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

console.log('Ì∫Ä Setting up Phase 1 Development Environment');

// 1. Install Phase 1 specific dependencies
console.log('Ì≥¶ Installing security and monitoring dependencies...');
execSync('npm install helmet cors csurf winston', { stdio: 'inherit' });
execSync('npm install -D @types/helmet @types/cors @types/csurf', { stdio: 'inherit' });

// 2. Setup structured logging directories
console.log('Ì≥ù Configuring structured logging...');
const logsDir = join(__dirname, '../../logs/phase1');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// 3. Create Phase 1 configuration file
console.log('‚öôÔ∏è Creating Phase 1 configuration...');
const envContent = `# PHASE 1 CONFIGURATION
NODE_ENV=development
LOG_LEVEL=info
LOG_FORMAT=json
SECURITY_HEADERS_ENABLED=true
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
JWT_COOKIE_SECURE=false  # true in production
JWT_COOKIE_HTTPONLY=true
CSRF_ENABLED=true
`;

const envPath = join(__dirname, '../../../.env.phase1');
require('fs').writeFileSync(envPath, envContent);

console.log('‚úÖ Phase 1 environment ready!');
console.log('Configuration saved to: .env.phase1');
console.log('Run: npm run setup:phase1 to apply configuration');
