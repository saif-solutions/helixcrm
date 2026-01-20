const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('🔍 Finding all properties on PrismaClient...\n');

// Get ALL properties including inherited ones
const allProps = [];
let obj = prisma;

while (obj) {
  allProps.push(...Object.getOwnPropertyNames(obj));
  obj = Object.getPrototypeOf(obj);
}

// Remove duplicates and sort
const uniqueProps = [...new Set(allProps)].sort();

// Show all properties that could be models
console.log('All properties:');
uniqueProps.forEach(prop => {
  if (prop === prop.toLowerCase() && !prop.startsWith('_') && !prop.startsWith('$')) {
    console.log(`  ${prop}`);
  }
});

// Try to access models with different naming patterns
console.log('\n🔍 Trying different naming patterns:');

const patterns = [
  'pipelineStage',
  'pipelineStages',
  'pipeline_stage',
  'pipeline_stages',
  'pipelinestage',
  'pipelinestages',
  'dealStageHistory',
  'dealStageHistories',
  'deal_stage_history',
  'deal_stage_histories',
  'dealstagehistory',
  'dealstagehistories',
  'rolePermission',
  'rolePermissions',
  'role_permission',
  'role_permissions',
  'rolepermission',
  'rolepermissions',
  'userRole',
  'userRoles',
  'user_role',
  'user_roles',
  'userrole',
  'userroles'
];

patterns.forEach(pattern => {
  if (uniqueProps.includes(pattern)) {
    const value = prisma[pattern];
    console.log(`  ✅ ${pattern}: ${typeof value}`);
  }
});

// Check if models exist by trying to query
console.log('\n🔍 Testing model queries:');

async function testQuery() {
  try {
    // Try to find any pipelineStage
    const result = await prisma.pipelineStage.findMany({ take: 1 });
    console.log('  ✅ pipelineStage.findMany() works');
  } catch (error) {
    console.log('  ❌ pipelineStage.findMany() failed:', error.message);
  }
  
  try {
    // Try alternative name
    const result = await prisma.pipelineStages.findMany({ take: 1 });
    console.log('  ✅ pipelineStages.findMany() works');
  } catch (error) {
    console.log('  ❌ pipelineStages.findMany() failed:', error.message);
  }
}

testQuery()
  .catch(console.error)
  .finally(() => prisma.$disconnect());