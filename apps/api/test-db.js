// Test database connection with existing Prisma client
const { PrismaClient } = require('@prisma/client');

async function test() {
  try {
    console.log('Testing Prisma connection...');
    const prisma = new PrismaClient();
    
    // Simple query
    const result = await prisma.$queryRaw`SELECT version() as db_version`;
    console.log('✅ Database connected:', result[0].db_version);
    
    // Check users table
    const users = await prisma.user.findMany({
      take: 1,
      select: { id: true, email: true }
    });
    console.log('✅ Users table accessible, count:', users.length);
    
    await prisma.$disconnect();
    console.log('✅ Test complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
