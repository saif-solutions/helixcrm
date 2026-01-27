import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addUserPermissions() {
  console.log('Adding user management permissions...');

  const userPermissions = [
    { code: 'users.read', name: 'Read Users', description: 'View users in organization', module: 'users' },
    { code: 'users.create', name: 'Create Users', description: 'Create new users', module: 'users' },
    { code: 'users.update', name: 'Update Users', description: 'Update user information', module: 'users' },
    { code: 'users.delete', name: 'Delete Users', description: 'Delete users', module: 'users' },
  ];

  for (const perm of userPermissions) {
    const existing = await prisma.permission.findUnique({
      where: { code: perm.code },
    });

    if (!existing) {
      await prisma.permission.create({
        data: perm,
      });
      console.log(`✓ Created permission: ${perm.code}`);
    } else {
      console.log(`• Already exists: ${perm.code}`);
    }
  }

  console.log('\n✅ User permissions added!');
  console.log('\nNext steps:');
  console.log('1. Run the RBAC initialization script to add these permissions to SystemAdmin role');
  console.log('2. Or restart server - new permissions will be added automatically during registration');
}

addUserPermissions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
