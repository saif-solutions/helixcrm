import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPermissionFormat() {
  console.log('Fixing permission codes from dot to colon notation...');
  
  // Permissions to fix
  const permissionUpdates = [
    { old: 'users.read', new: 'users:read' },
    { old: 'users.create', new: 'users:create' },
    { old: 'users.update', new: 'users:update' },
    { old: 'users.delete', new: 'users:delete' },
  ];

  for (const update of permissionUpdates) {
    // Check if new code already exists
    const existingNew = await prisma.permission.findUnique({
      where: { code: update.new },
    });

    if (existingNew) {
      console.log(`✓ ${update.new} already exists`);
      continue;
    }

    // Find old permission
    const oldPermission = await prisma.permission.findUnique({
      where: { code: update.old },
    });

    if (oldPermission) {
      // Update to new code
      await prisma.permission.update({
        where: { id: oldPermission.id },
        data: { code: update.new },
      });
      
      console.log(`✓ Updated ${update.old} → ${update.new}`);
    } else {
      console.log(`✗ ${update.old} not found`);
    }
  }

  console.log('\n✅ Permission codes updated!');
  console.log('Now re-login to get fresh token.');
}

fixPermissionFormat()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
