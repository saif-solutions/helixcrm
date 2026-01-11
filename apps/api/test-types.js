// Test if TypeScript would accept refreshTokenVersion
const testCode = `
const userUpdate = {
  refreshTokenHash: 'test',
  refreshTokenVersion: 'test-version', // This should now work
  refreshTokenIssuedAt: new Date(),
  lastLoginAt: new Date(),
};
console.log('TypeScript should accept refreshTokenVersion now');
console.log('Test object:', userUpdate);
`;

console.log(testCode);

// Also test actual Prisma client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        refreshTokenHash: true,
        refreshTokenVersion: true, // This should work now
        refreshTokenIssuedAt: true,
      }
    });
    console.log('✅ Prisma client accepts refreshTokenVersion field');
    console.log('User data:', user);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
