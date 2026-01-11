const { PrismaClient } = require('@prisma/client');

async function checkColumn() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking if refreshTokenVersion column exists in database...');
    
    // Direct SQL query to check column
    const columnCheck = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'refreshTokenVersion'
    `;
    
    if (columnCheck.length > 0) {
      console.log('✅ refreshTokenVersion column exists in database');
    } else {
      console.log('❌ refreshTokenVersion column NOT found in database');
      console.log('Need to add column with SQL:');
      console.log('  ALTER TABLE "users" ADD COLUMN "refreshTokenVersion" VARCHAR(255)');
    }
    
    // Also check if Prisma client can access it
    console.log('\nChecking Prisma client...');
    try {
      const user = await prisma.user.findFirst({
        select: {
          id: true,
          email: true,
          refreshTokenHash: true,
          // Try to select refreshTokenVersion
        }
      });
      console.log('✅ Prisma client working');
    } catch (prismaError) {
      console.log('Prisma client error:', prismaError.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumn();
