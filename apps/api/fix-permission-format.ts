import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPermissionFormat() {
  console.log('Fixing permission codes from dot to colon notation...');
  
  // Permissions to fix - UPDATED to correct colon format
  const permissionUpdates = [
    { old: 'users.read', new: 'user:read' },      // ✅ Fixed: 'users:read' → 'user:read'
    { old: 'users.create', new: 'user:create' },  // ✅ Fixed: 'users:create' → 'user:create'
    { old: 'users.update', new: 'user:update' },  // ✅ Fixed: 'users:update' → 'user:update'
    { old: 'users.delete', new: 'user:delete' },  // ✅ Fixed: 'users:delete' → 'user:delete'
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