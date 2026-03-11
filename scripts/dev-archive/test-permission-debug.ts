// apps/api/test-permission-debug.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugPermissions() {
  try {
    console.log('🔍 DEBUG PERMISSIONS FOR TEST USER\n');

    const userId = '6cf63c15-e6be-4525-bc35-fdc39624b49b';
    const organizationId = 'd1d82a59-5bb0-407d-bd8c-b8aee70e3f62';

    // Exactly the same query as PermissionGuard
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        UserRoles: {
          where: {
            role: {
              organizationId: organizationId,
            },
          },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log('1. User found:', userWithRoles?.email);
    console.log('2. UserRoles count:', userWithRoles?.UserRoles.length);

    if (userWithRoles?.UserRoles) {
      console.log('\n3. User Roles and Permissions:');
      userWithRoles.UserRoles.forEach((userRole, index) => {
        console.log(`\n   Role ${index + 1}: ${userRole.role.name}`);
        console.log(`   Permissions (${userRole.role.permissions.length}):`);

        userRole.role.permissions.forEach((rp, permIndex) => {
          console.log(`     ${permIndex + 1}. ${rp.permission.code} - ${rp.permission.name}`);
        });
      });

      // Extract all permission codes
      const allPermissions = new Set<string>();
      userWithRoles.UserRoles.forEach((userRole) => {
        userRole.role.permissions.forEach((rp) => {
          allPermissions.add(rp.permission.code);
        });
      });

      console.log('\n4. All unique permission codes:');
      console.log(
        Array.from(allPermissions)
          .map((p) => `  - ${p}`)
          .join('\n'),
      );

      // Check specific permissions
      console.log('\n5. Checking specific permissions:');
      const requiredPermissions = ['rbac.read', 'contacts.read'];
      requiredPermissions.forEach((perm) => {
        const hasPerm = Array.from(allPermissions).includes(perm);
        console.log(`   ${perm}: ${hasPerm ? '✅' : '❌'}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPermissions();
