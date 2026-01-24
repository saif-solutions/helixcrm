// apps/api/test-jwt-config.ts
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔐 JWT CONFIGURATION TEST\n');

// Check environment variables
console.log('1. ENVIRONMENT VARIABLES:');
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✓ Set' : '✗ Missing'}`);
console.log(`   JWT_EXPIRES_IN: ${process.env.JWT_EXPIRES_IN || '15m (default)'}`);
console.log(`   JWT_REFRESH_EXPIRES_IN: ${process.env.JWT_REFRESH_EXPIRES_IN || '7d (default)'}`);
console.log(`   JWT_ISSUER: ${process.env.JWT_ISSUER || 'helixcrm (default)'}`);
console.log(`   JWT_AUDIENCE: ${process.env.JWT_AUDIENCE || 'helixcrm-client (default)'}`);

// Import and check SecurityConfig
import SecurityConfig from './src/config/security.config';

console.log('\n2. SECURITY CONFIG:');
console.log(`   accessTokenExpiry: ${SecurityConfig.jwt.accessTokenExpiry}`);
console.log(`   refreshTokenExpiry: ${SecurityConfig.jwt.refreshTokenExpiry}`);
console.log(`   issuer: ${SecurityConfig.jwt.issuer}`);
console.log(`   audience: ${SecurityConfig.jwt.audience}`);

// Verify alignment
console.log('\n3. ALIGNMENT CHECK:');
const issues: string[] = [];

// Check issuer alignment
const envIssuer = process.env.JWT_ISSUER || 'helixcrm';
if (SecurityConfig.jwt.issuer !== envIssuer) {
  issues.push(`Issuer mismatch: SecurityConfig=${SecurityConfig.jwt.issuer}, Env=${envIssuer}`);
}

// Check audience alignment
const envAudience = process.env.JWT_AUDIENCE || 'helixcrm-client';
if (SecurityConfig.jwt.audience !== envAudience) {
  issues.push(`Audience mismatch: SecurityConfig=${SecurityConfig.jwt.audience}, Env=${envAudience}`);
}

// Check expiry alignment
const envExpiry = process.env.JWT_EXPIRES_IN || '15m';
if (SecurityConfig.jwt.accessTokenExpiry !== envExpiry) {
  issues.push(`Access token expiry mismatch: SecurityConfig=${SecurityConfig.jwt.accessTokenExpiry}, Env=${envExpiry}`);
}

// Check refresh expiry alignment
const envRefreshExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
if (SecurityConfig.jwt.refreshTokenExpiry !== envRefreshExpiry) {
  issues.push(`Refresh token expiry mismatch: SecurityConfig=${SecurityConfig.jwt.refreshTokenExpiry}, Env=${envRefreshExpiry}`);
}

// Report results
if (issues.length === 0) {
  console.log('   ✅ All configurations are aligned!');
} else {
  console.log('   ❌ Configuration issues found:');
  issues.forEach(issue => console.log(`     - ${issue}`));
}

console.log('\n4. NEXT STEPS:');
console.log('   - Restart server to apply new JWT configuration');
console.log('   - Test login to generate new tokens');
console.log('   - Verify token verification works');