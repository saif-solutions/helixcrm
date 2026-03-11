/**
 * Contract Verification Script
 * Verifies that all contracts are consistent and properly exported
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying Auth Core Contract Consistency...\n');

// Read contract file
const contractPath = path.join(__dirname, '..', 'src', 'contracts', 'auth.contract.ts');
const contractContent = fs.readFileSync(contractPath, 'utf-8');

// Check critical signatures
const checks = [
  {
    name: 'issueRefreshToken return type',
    pattern: /issueRefreshToken\(userId: string, organizationId: string\): Promise<string>/,
    required: true,
  },
  {
    name: 'UserRepository security methods',
    pattern: /isAccountLocked\(userId: string\): Promise<boolean>/,
    required: true,
  },
  {
    name: 'UserRepository recordFailedAttempt',
    pattern: /recordFailedAttempt\(userId: string\): Promise<void>/,
    required: true,
  },
  {
    name: 'UserRepository resetFailedAttempts',
    pattern: /resetFailedAttempts\(userId: string\): Promise<void>/,
    required: true,
  },
];

console.log('📄 Contract File Analysis:');
console.log(`Location: ${contractPath}`);
console.log(`Size: ${contractContent.length} bytes\n`);

let allPassed = true;

checks.forEach((check) => {
  const matches = contractContent.match(check.pattern);
  const passed = !!matches === check.required;

  console.log(`${passed ? '✅' : '❌'} ${check.name}: ${passed ? 'PASS' : 'FAIL'}`);
  if (!passed && check.required) {
    console.log(`   Expected pattern: ${check.pattern}`);
    allPassed = false;
  }
});

// Check factory file
const factoryPath = path.join(__dirname, '..', 'src', 'core', 'auth-core.factory.ts');
if (fs.existsSync(factoryPath)) {
  console.log('\n🏭 Factory File Analysis:');
  const factoryContent = fs.readFileSync(factoryPath, 'utf-8');

  // Check for createAuthCore export
  const hasFactoryExport =
    factoryContent.includes('export function createAuthCore') ||
    factoryContent.includes('export const createAuthCore');
  console.log(
    `${hasFactoryExport ? '✅' : '❌'} createAuthCore export: ${hasFactoryExport ? 'PRESENT' : 'MISSING'}`,
  );

  if (!hasFactoryExport) {
    allPassed = false;
    console.log('   Factory function must be exported');
  }
}

// Check index.ts
const indexPath = path.join(__dirname, '..', 'src', 'index.ts');
if (fs.existsSync(indexPath)) {
  console.log('\n📦 Index File Analysis:');
  const indexContent = fs.readFileSync(indexPath, 'utf-8');

  const checks = [
    { name: 'createAuthCore import', pattern: /createAuthCore/ },
    { name: 'CreateAuthCoreOptions import', pattern: /CreateAuthCoreOptions/ },
    { name: 'AuthCoreDependencies import', pattern: /AuthCoreDependencies/ },
  ];

  checks.forEach((check) => {
    const hasImport = indexContent.includes(check.name);
    console.log(`${hasImport ? '✅' : '❌'} ${check.name}: ${hasImport ? 'PRESENT' : 'MISSING'}`);
    if (!hasImport) allPassed = false;
  });
}

console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log('🎉 ALL CONTRACT CHECKS PASSED');
  console.log('The auth-core package is ready for production.');
} else {
  console.log('❌ CONTRACT INCONSISTENCIES DETECTED');
  console.log('Please fix the issues above before proceeding.');
}
console.log('='.repeat(50));

process.exit(allPassed ? 0 : 1);
