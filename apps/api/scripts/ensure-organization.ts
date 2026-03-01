import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureOrganization() {
  const orgId = '6620ee6e-143c-44a2-a6a3-d8b4d44f65be';
  
  console.log(`í´ Checking for organization: ${orgId}`);
  
  // Check if organization exists
  let org = await prisma.organization.findUnique({
    where: { id: orgId }
  });
  
  if (org) {
    console.log('âœ… Organization found:', {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status
    });
  } else {
    console.log('í³ Organization not found, creating...');
    
    org = await prisma.organization.create({
      data: {
        id: orgId,
        name: 'Test Organization',
        slug: 'test-org',
        status: 'active'
      }
    });
    
    console.log('âœ… Organization created:', {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status
    });
  }
  
  // Verify user belongs to this organization
  const user = await prisma.user.findUnique({
    where: { email: 'test@helixcrm.com' },
    include: { organization: true }
  });
  
  if (user) {
    console.log('\ní±¤ User details:', {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      organizationName: user.organization?.name
    });
    
    if (user.organizationId !== orgId) {
      console.log('âš ï¸  User organization mismatch! Updating...');
      
      await prisma.user.update({
        where: { id: user.id },
        data: { organizationId: orgId }
      });
      
      console.log('âœ… User organization updated');
    }
  } else {
    console.log('âŒ User test@helixcrm.com not found');
  }
}

ensureOrganization()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
