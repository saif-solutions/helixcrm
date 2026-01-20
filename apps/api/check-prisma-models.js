const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const modelKeys = Object.keys(p).filter(k => {
  return k === k.toLowerCase() && k.indexOf('$') === -1;
}).sort();

console.log('Available Prisma models:');
modelKeys.forEach(key => {
  console.log(`  - ${key}`);
});

// Check for specific models
const modelsToCheck = [
  'permission',
  'pipeline', 
  'pipelineStage',
  'deal',
  'dealStageHistory',
  'role',
  'rolePermission',
  'userRole'
];

console.log('\nLooking for Phase 3 models:');
modelsToCheck.forEach(model => {
  const exists = modelKeys.includes(model);
  console.log(`  ${exists ? '✓' : '✗'} ${model} ${exists ? '' : '(NOT FOUND)'}`);
});