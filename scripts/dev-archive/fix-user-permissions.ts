import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUserPermissions() {
  console.log('Adding user management permissions to SystemAdmin roles...');

  // 1. Ensure user permissions exist - CONVERTED TO COLON FORMAT
  const userPermissions = [
    {
      code: 'user:read',
      name: 'Read Users',
      description: 'View users in organization',
      module: 'users',
    }, // ✅ Fixed: 'users.read' → 'user:read'
    { code: 'user:create', name: 'Create Users', description: 'Create new users', module: 'users' }, // ✅ Fixed: 'users.create' → 'user:create'
    {
      code: 'user:update',
      name: 'Update Users',
      description: 'Update user information',
      module: 'users',
    }, // ✅ Fixed: 'users.update' → 'user:update'
    { code: 'user:delete', name: 'Delete Users', description: 'Delete users', module: 'users' }, // ✅ Fixed: 'users.delete' → 'user:delete'
  ];

  for (const perm of userPermissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
    console.log(`✓ Permission: ${perm.code}`);
  }

  // 2. Add to all SystemAdmin roles
  const systemAdminRoles = await prisma.role.findMany({
    where: { name: 'SystemAdmin' },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  console.log(`\nUpdating ${systemAdminRoles.length} SystemAdmin roles:`);

  for (const role of systemAdminRoles) {
    const existingPermissionCodes = role.permissions.map((rp) => rp.permission.code);
    const missingPermissions = userPermissions.filter(
      (p) => !existingPermissionCodes.includes(p.code),
    );

    if (missingPermissions.length > 0) {
      for (const perm of missingPermissions) {
        const permission = await prisma.permission.findUnique({
          where: { code: perm.code },
        });

        if (permission) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permission.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permission.id,
            },
          });
        }
      }
      console.log(
        `  ✓ Added ${missingPermissions.length} permissions to SystemAdmin in org ${role.organizationId.substring(0, 8)}...`,
      );
    } else {
      console.log(`  • SystemAdmin already has all user permissions`);
    }
  }

  console.log('\n✅ User permissions added to SystemAdmin roles!');
  console.log('\nNext: Re-login to get fresh token with updated permissions.');
}

fixUserPermissions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
