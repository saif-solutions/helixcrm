const { PrismaClient } = require('@prisma/client');

async function addColumn() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Adding refreshTokenVersion column to database...');
    
    // 1. Check if column already exists
    const columnCheck = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'refreshTokenVersion'
    `;
    
    if (columnCheck.length > 0) {
      console.log('‚úÖ Column already exists');
    } else {
      // 2. Add column
      console.log('Executing: ALTER TABLE "users" ADD COLUMN "refreshTokenVersion" VARCHAR(255)');
      await prisma.$queryRaw`
        ALTER TABLE "users" 
        ADD COLUMN "refreshTokenVersion" VARCHAR(255)
      `;
      console.log('‚úÖ Column added successfully');
    }
    
    // 3. Check if index exists
    const indexCheck = await prisma.$queryRaw`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'users' 
      AND indexname = 'users_refreshTokenVersion_idx'
    `;
    
    if (indexCheck.length > 0) {
      console.log('‚úÖ Index already exists');
    } else {
      // 4. Add index
      console.log('Executing: CREATE INDEX "users_refreshTokenVersion_idx" ON "users"("refreshTokenVersion")');
      await prisma.$queryRaw`
        CREATE INDEX "users_refreshTokenVersion_idx" 
        ON "users"("refreshTokenVersion")
      `;
      console.log('‚úÖ Index added successfully');
    }
    
    console.log('Ìæâ Database migration completed!');
    
  } catch (error) {
    console.error('‚ùå Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addColumn();
