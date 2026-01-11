const fs = require('fs');
const path = require('path');

const authServicePath = path.join(__dirname, 'src/modules/auth/auth.service.ts');
let content = fs.readFileSync(authServicePath, 'utf8');

console.log('Updating login() method to store refreshTokenVersion...');

// Find the login method and update the database update
const loginMethodStart = content.indexOf('async login(user: any, res: any)');
if (loginMethodStart === -1) {
  console.error('Could not find login method');
  process.exit(1);
}

// Find the database update in login method
const updatePattern = /await this\.prisma\.user\.update\(\{[^}]+data: \{[\s\S]*?refreshTokenHash,[\s\S]*?\}/;
const match = content.match(updatePattern);

if (match) {
  const oldUpdate = match[0];
  
  // Add refreshTokenVersion to the update
  const newUpdate = oldUpdate.replace(
    'refreshTokenHash,',
    'refreshTokenHash,\n          refreshTokenVersion: initialVersion, // Store version for replay protection,'
  );
  
  content = content.replace(oldUpdate, newUpdate);
  fs.writeFileSync(authServicePath, content, 'utf8');
  console.log('✅ Login method updated successfully');
} else {
  console.error('Could not find database update in login method');
  console.log('Please manually add: refreshTokenVersion: initialVersion, to the login update');
}
