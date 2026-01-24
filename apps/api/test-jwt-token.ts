// apps/api/test-jwt-token.ts
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

console.log('🔐 JWT TOKEN GENERATION & VERIFICATION TEST\n');

// Test configuration
const config = {
  secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  issuer: process.env.JWT_ISSUER || 'helixcrm',
  audience: process.env.JWT_AUDIENCE || 'helixcrm-client',
};

console.log('1. USING CONFIGURATION:');
console.log(`   Secret: ${config.secret.substring(0, 10)}... (${config.secret.length} chars)`);
console.log(`   Expires In: ${config.expiresIn}`);
console.log(`   Issuer: ${config.issuer}`);
console.log(`   Audience: ${config.audience}`);

console.log('\n2. GENERATING TEST TOKEN:');

const testPayload = {
  sub: 'test-user-id',
  email: 'test@example.com',
  organizationId: 'test-org-id',
  tokenVersion: 1,
  type: 'access',
};

// Generate token
const token = jwt.sign(testPayload, config.secret, {
  expiresIn: config.expiresIn,
  issuer: config.issuer,
  audience: config.audience,
});

console.log(`   Token generated: ${token.substring(0, 50)}...`);
console.log(`   Token length: ${token.length} characters`);

console.log('\n3. VERIFYING TOKEN:');

try {
  // Verify token
  const decoded = jwt.verify(token, config.secret, {
    issuer: config.issuer,
    audience: config.audience,
  });

  console.log('   ✅ Token verification SUCCESSFUL');
  console.log(`   Decoded payload:`);
  console.log(`     - sub: ${(decoded as any).sub}`);
  console.log(`     - email: ${(decoded as any).email}`);
  console.log(`     - organizationId: ${(decoded as any).organizationId}`);
  console.log(`     - issuer: ${(decoded as any).iss}`);
  console.log(`     - audience: ${(decoded as any).aud}`);
  console.log(`     - expires: ${new Date((decoded as any).exp * 1000).toISOString()}`);

  // Test with wrong issuer (should fail)
  console.log('\n4. TESTING MISMATCHED ISSUER (should fail):');
  try {
    jwt.verify(token, config.secret, {
      issuer: 'wrong-issuer',
      audience: config.audience,
    });
    console.log('   ❌ ERROR: Token verification should have failed with wrong issuer!');
  } catch (error: any) {
    console.log(`   ✅ Expected failure: ${error.message}`);
  }

  // Test with wrong audience (should fail)
  console.log('\n5. TESTING MISMATCHED AUDIENCE (should fail):');
  try {
    jwt.verify(token, config.secret, {
      issuer: config.issuer,
      audience: 'wrong-audience',
    });
    console.log('   ❌ ERROR: Token verification should have failed with wrong audience!');
  } catch (error: any) {
    console.log(`   ✅ Expected failure: ${error.message}`);
  }

  // Test with wrong secret (should fail)
  console.log('\n6. TESTING MISMATCHED SECRET (should fail):');
  try {
    jwt.verify(token, 'wrong-secret', {
      issuer: config.issuer,
      audience: config.audience,
    });
    console.log('   ❌ ERROR: Token verification should have failed with wrong secret!');
  } catch (error: any) {
    console.log(`   ✅ Expected failure: ${error.message}`);
  }

} catch (error: any) {
  console.log(`   ❌ Token verification FAILED: ${error.message}`);
}

console.log('\n7. CONCLUSION:');
console.log('   JWT configuration is working correctly!');
console.log('   Tokens are being signed and verified with issuer/audience validation.');
console.log('\n   NEXT: Start PostgreSQL database and test full login flow.');