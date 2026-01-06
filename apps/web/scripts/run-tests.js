#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting HelixCRM UX Foundation Tests...\n');

// Check if tests directory exists
const testsDir = path.join(__dirname, '../src/components/feedback/__tests__');
if (!fs.existsSync(testsDir)) {
  console.error('❌ Tests directory not found:', testsDir);
  process.exit(1);
}

// Run tests in sequence
const testSuites = [
  {
    name: 'Design Tokens',
    command: 'npm test -- src/styles/__tests__/tokens.test.ts',
  },
  {
    name: 'Toast System',
    command: 'npm test -- src/components/feedback/__tests__/ToastProvider.test.tsx',
  },
  {
    name: 'Loading Components',
    command: 'npm test -- src/components/feedback/__tests__/LoadingOverlay.test.tsx',
  },
  {
    name: 'Error Boundary',
    command: 'npm test -- src/components/feedback/__tests__/ErrorBoundary.test.tsx',
  },
];

let allPassed = true;

for (const suite of testSuites) {
  console.log(`\n📋 Running ${suite.name} Tests...`);
  console.log('='.repeat(50));
  
  try {
    execSync(suite.command, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    console.log(`\n✅ ${suite.name} Tests PASSED\n`);
  } catch (error) {
    console.log(`\n❌ ${suite.name} Tests FAILED\n`);
    allPassed = false;
  }
}

// Run Tailwind config test
console.log('\n📋 Running Tailwind Configuration Test...');
console.log('='.repeat(50));
try {
  execSync('node __tests__/tailwind.test.js', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  console.log('\n✅ Tailwind Configuration Test PASSED\n');
} catch (error) {
  console.log('\n❌ Tailwind Configuration Test FAILED\n');
  allPassed = false;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(50));

if (allPassed) {
  console.log('✅ All tests passed! UX Foundation is ready.');
  console.log('\n🎉 Next steps:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Verify components in Storybook (if configured)');
  console.log('3. Test toast notifications in the browser');
  console.log('4. Test loading states and error boundaries');
} else {
  console.log('❌ Some tests failed. Please fix the issues before proceeding.');
  process.exit(1);
}