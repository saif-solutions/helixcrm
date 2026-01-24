const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetTestUser() {
  try {
    console.log('Resetting test user...');
    
    // Find test user
    const user = await prisma.user.findUnique({
      where: { email: 'testuser@example.com' },
    });
    
    if (!user) {
      console.log('Test user not found');
      return;
    }
    
    // Invalidate all tokens
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tokenVersion: { increment: 1 },
        refreshTokenHash: null,
        refreshTokenVersion: null,
      },
    });
    
    console.log('✅ All tokens invalidated for test user');
    console.log('New token version:', user.tokenVersion + 1);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetTestUser();
