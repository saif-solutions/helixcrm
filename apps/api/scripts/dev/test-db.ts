import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  console.log("Testing database connection...");
  
  try {
    // Test connection
    await prisma.$connect();
    console.log("✓ Database connection successful");
    
    // Test raw query
    const result: any = await prisma.$queryRaw`SELECT version()`;
    console.log("✓ PostgreSQL version:", result[0].version);
    
    // Count tables
    const tables: any = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log(`✓ Found ${tables.length} tables in database`);
    
    // List tables
    console.log("Tables:");
    tables.forEach((table: any) => {
      console.log(`  - ${table.table_name}`);
    });
    
  } catch (error) {
    console.error("✗ Database connection failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();
