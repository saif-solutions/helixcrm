const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all property names
const allProps = Object.getOwnPropertyNames(prisma);

// Filter for model properties (lowercase, not starting with $ or _)
const modelProps = allProps.filter(prop => {
  return prop === prop.toLowerCase() && 
         !prop.startsWith('$') && 
         !prop.startsWith('_') &&
         !['disconnect', 'connect', 'transaction', 'interactiveTransaction', 'on', '$use'].includes(prop);
});

console.log('Model properties found:');
modelProps.sort().forEach(prop => {
  console.log(`  - ${prop}`);
});

console.log('\nLooking for Phase 3 models:');
const phase3Models = ['permission', 'pipeline', 'pipelinestage', 'deal', 'dealstagehistory', 'role', 'rolepermission', 'userrole'];

phase3Models.forEach(model => {
  const found = modelProps.find(prop => prop.toLowerCase() === model.toLowerCase());
  console.log(`  ${found ? '✓' : '✗'} ${model} -> ${found || 'NOT FOUND'}`);
});

prisma.$disconnect();