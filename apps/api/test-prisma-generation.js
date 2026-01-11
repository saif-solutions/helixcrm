const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Testing Prisma generation...');

// Check if we have the correct schema
const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
if (!fs.existsSync(schemaPath)) {
  console.error('Schema file not found:', schemaPath);
  process.exit(1);
}

console.log('Schema exists:', schemaPath);

// Try to generate with minimal config
const tempSchema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                   String   @id @default(uuid())
  email                String   @unique
  refreshTokenHash     String?
  refreshTokenVersion  String?
}
`;

fs.writeFileSync('temp-schema.prisma', tempSchema);

try {
  console.log('Trying to generate with temp schema...');
  execSync('npx prisma generate --schema=./temp-schema.prisma', { stdio: 'inherit' });
  console.log('✅ Generation successful with temp schema');
} catch (error) {
  console.error('❌ Generation failed:', error.message);
} finally {
  fs.unlinkSync('temp-schema.prisma');
}
