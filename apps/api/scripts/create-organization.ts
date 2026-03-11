import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createOrganization() {
  const orgId = '6620ee6e-143c-44a2-a6a3-d8b4d44f65be';

  // Check if organization exists
  let org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    console.log('��� Creating organization...');
    org = await prisma.organization.create({
      data: {
        id: orgId,
        name: 'Test Organization',
        slug: 'test-org',
        status: 'active',
      },
    });
    console.log('✅ Organization created:', org.id);
  } else {
    console.log('✅ Organization already exists');
  }
}

createOrganization()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
