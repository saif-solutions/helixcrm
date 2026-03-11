// apps/api/debug-user-state.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugUserState() {
  try {
    console.log('🔍 DEBUG USER STATE\n');

    const user = await prisma.user.findUnique({
      where: { email: 'testuser@example.com' },
      include: {
        organization: true,
        UserRoles: {
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

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Organization ID: ${user.organizationId}`);
    console.log(`  Organization Name: ${user.organization.name}`);
    console.log(`  Token Version: ${user.tokenVersion}`);
    console.log(`  Role: ${user.role}`);

    console.log('\nUser Roles:');
    user.UserRoles.forEach((userRole) => {
      console.log(`  - ${userRole.role.name} (${userRole.role.permissions.length} permissions)`);
      userRole.role.permissions.forEach((rp) => {
        console.log(`    * ${rp.permission.code}`);
      });
    });

    console.log('\n✅ Debug complete');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserState();
