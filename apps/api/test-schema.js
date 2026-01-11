// Test if refreshTokenVersion field is in the schema
const { PrismaClient } = require('@prisma/client');

async function testSchema() {
  console.log('Ì¥ç Testing schema...');
  
  try {
    const prisma = new PrismaClient();
    
    // Check database connection
    const test = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('‚úÖ Database connected:', test);
    
    // Check if we can access the field
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        refreshTokenHash: true,
        refreshTokenVersion: true, // This should work if field exists
        refreshTokenIssuedAt: true,
      }
    });
    
    console.log('‚úÖ Prisma client working');
    console.log('Sample user data:', user);
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('‚ùå Error:', error.message);
  }
}

testSchema();
