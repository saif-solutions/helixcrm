// D:\Projects-In-Hand\helixcrm\test-security-quick.js
const { exec } = require('child_process');
const path = require('path');

console.log('🔒 Quick Security Test for HelixCRM\n');

// Test 1: Check if API is running
exec('curl -s http://localhost:3000/health', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ API is not running on http://localhost:3000');
    console.log('   Start it with: cd apps/api && npm run start:dev');
    process.exit(1);
  }
  
  console.log('✅ API is running:', stdout.trim());
  
  // Test 2: Check if database is accessible
  console.log('\n🟡 Checking database connection...');
  
  const prismaTest = `
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    async function test() {
      try {
        await prisma.\$connect();
        const orgs = await prisma.organization.findMany({ take: 1 });
        console.log('✅ Database connected');
        console.log('   Organizations in DB:', orgs.length);
        
        // Try unsafe query
        try {
          await prisma.user.findMany({ where: { email: { contains: 'test' } } });
          console.log('❌ SECURITY ISSUE: Safeguard allowed unsafe query!');
        } catch (error) {
          if (error.message.includes('SECURITY VIOLATION')) {
            console.log('✅ Safeguard is blocking unsafe queries');
          } else {
            console.log('⚠️ Different error:', error.message);
          }
        }
        
        await prisma.\$disconnect();
      } catch (error) {
        console.log('❌ Database error:', error.message);
      }
    }
    
    test();
  `;
  
  // Write temporary test file
  const fs = require('fs');
  const testFile = path.join(__dirname, 'temp-security-test.js');
  fs.writeFileSync(testFile, prismaTest);
  
  exec(`node ${testFile}`, (error, stdout, stderr) => {
    console.log(stdout);
    if (stderr) console.log('Stderr:', stderr);
    
    // Cleanup
    fs.unlinkSync(testFile);
    
    if (error) {
      console.log('❌ Security test failed');
      process.exit(1);
    } else {
      console.log('\n🎉 Security checks complete!');
    }
  });
});