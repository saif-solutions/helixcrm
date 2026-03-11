console.log('📦 Checking NestJS versions...\n');

try {
  // Read package.json
  const packageJson = require('../package.json');

  console.log('Current versions:');
  console.log('=================');

  const deps = packageJson.dependencies || {};
  const devDeps = packageJson.devDependencies || {};

  // Check NestJS packages
  const nestPackages = [
    '@nestjs/common',
    '@nestjs/core',
    '@nestjs/platform-express',
    '@nestjs/testing',
  ];

  nestPackages.forEach((pkg) => {
    const version = deps[pkg] || devDeps[pkg];
    console.log(`${pkg}: ${version || 'NOT INSTALLED'}`);
  });

  console.log('\n✅ Package check complete');
} catch (error) {
  console.error('❌ Error reading package.json:', error.message);
}
