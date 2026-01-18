const { PrismaClient } = require('@prisma/client');

async function cleanup() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Starting database cleanup...');
    
    // Delete all leads
    const deletedLeads = await prisma.lead.deleteMany({});
    console.log(`Deleted ${deletedLeads.count} leads`);
    
    // Delete all contacts
    const deletedContacts = await prisma.contact.deleteMany({});
    console.log(`Deleted ${deletedContacts.count} contacts`);
    
    // Find and delete test users
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: 'testuser'
        }
      }
    });
    
    for (const user of testUsers) {
      // Delete user's password reset tokens first
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id }
      });
      
      // Delete the user
      await prisma.user.delete({
        where: { id: user.id }
      });
      console.log(`Deleted user: ${user.email}`);
    }
    
    // Delete test organizations
    const testOrgs = await prisma.organization.findMany({
      where: {
        OR: [
          { name: { contains: 'Test' } },
          { name: { contains: 'test' } }
        ]
      }
    });
    
    for (const org of testOrgs) {
      await prisma.organization.delete({
        where: { id: org.id }
      });
      console.log(`Deleted organization: ${org.name}`);
    }
    
    console.log('✅ Database cleanup complete!');
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();