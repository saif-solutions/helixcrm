import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting AuditLog schema enhancements...');

  // Check current structure
  const tableInfo = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'AuditLog' 
    AND table_schema = 'public'
    ORDER BY ordinal_position;
  `;

  console.log('Current AuditLog columns:');
  console.table(tableInfo);

  // Add new columns if they don't exist
  try {
    await prisma.$executeRaw`
      -- Add actorType column
      ALTER TABLE "AuditLog" 
      ADD COLUMN IF NOT EXISTS "actorType" VARCHAR(20) DEFAULT 'user';
      
      -- Add severity column
      ALTER TABLE "AuditLog" 
      ADD COLUMN IF NOT EXISTS "severity" VARCHAR(20) DEFAULT 'LOW';
      
      -- Add requestId column
      ALTER TABLE "AuditLog" 
      ADD COLUMN IF NOT EXISTS "requestId" VARCHAR(255);
    `;

    console.log('✅ Added new columns to AuditLog table');
  } catch (error) {
    console.error('❌ Error adding columns:', error);
  }

  // Create indexes if they don't exist
  try {
    await prisma.$executeRaw`
      -- Index for severity
      CREATE INDEX IF NOT EXISTS "AuditLog_severity_idx" ON "AuditLog"("severity");
      
      -- Composite index for actorType and createdAt
      CREATE INDEX IF NOT EXISTS "AuditLog_actorType_createdAt_idx" ON "AuditLog"("actorType", "createdAt" DESC);
      
      -- Index for requestId
      CREATE INDEX IF NOT EXISTS "AuditLog_requestId_idx" ON "AuditLog"("requestId");
    `;

    console.log('✅ Created indexes for AuditLog table');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }

  // Update existing records with default values
  try {
    await prisma.$executeRaw`
      -- Update existing records where actorType is null
      UPDATE "AuditLog" 
      SET "actorType" = 'user' 
      WHERE "actorType" IS NULL;
      
      -- Update existing records where severity is null
      UPDATE "AuditLog" 
      SET "severity" = 'LOW' 
      WHERE "severity" IS NULL;
    `;

    console.log('✅ Updated existing records with default values');
  } catch (error) {
    console.error('❌ Error updating records:', error);
  }

  console.log('✅ AuditLog schema enhancements completed!');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
