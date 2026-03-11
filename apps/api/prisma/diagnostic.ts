import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('🔍 Diagnosing Prisma Client...');

  // Check if models exist by trying to access them
  console.log('\n1. Checking model properties:');

  // List all properties of prisma
  const prismaProps = Object.getOwnPropertyNames(prisma);
  console.log('   Total properties on prisma:', prismaProps.length);

  // Filter for model-like properties (lowercase, not starting with $, not common methods)
  const modelProps = prismaProps.filter(
    (prop) =>
      prop === prop.toLowerCase() &&
      !prop.startsWith('$') &&
      ![
        '_',
        'transaction',
        'interactiveTransaction',
        'disconnect',
        'connect',
        'on',
        '$use',
      ].includes(prop),
  );

  console.log('   Possible model properties:', modelProps.sort().join(', '));

  // Check specifically for our new models
  console.log('\n2. Looking for Phase 3 models:');
  const phase3Models = [
    'permission',
    'pipeline',
    'pipelineStage',
    'deal',
    'dealStageHistory',
    'role',
    'rolePermission',
    'userRole',
  ];

  for (const model of phase3Models) {
    const exists = modelProps.includes(model);
    console.log(
      `   ${exists ? '✅' : '❌'} ${model}: ${exists ? 'FOUND' : 'NOT FOUND'}`,
    );
  }

  // Try to instantiate each model with a simple operation
  console.log('\n3. Testing model instantiation:');

  for (const model of phase3Models) {
    if (modelProps.includes(model)) {
      try {
        // Try to access the model
        const modelInstance = (prisma as any)[model];
        console.log(`   ✅ ${model}: Type: ${typeof modelInstance}`);
      } catch (error: any) {
        console.log(`   ❌ ${model}: Error: ${error.message}`);
      }
    }
  }
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
