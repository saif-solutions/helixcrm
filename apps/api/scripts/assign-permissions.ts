import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignPermissions() {
  console.log('🔐 Starting permission assignment...');

  // Your test user ID from the token
  const userId = '3163357d-dbe8-4e24-932c-ff79ca722866';

  // Get user with organization
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: true,
    },
  });

  if (!user) {
    console.error('❌ User not found');
    return;
  }

  console.log(`✅ Found user: ${user.email}`);
  console.log(`📁 Organization: ${user.organizationId}`);

  // Get all permissions
  const allPermissions = await prisma.permission.findMany();
  console.log(`📋 Found ${allPermissions.length} permissions in system`);

  // Create or find Admin role
  let adminRole = await prisma.role.findFirst({
    where: {
      name: 'Admin',
      organizationId: user.organizationId,
    },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!adminRole) {
    console.log('📝 Creating Admin role...');

    adminRole = await prisma.role.create({
      data: {
        name: 'Admin',
        description: 'Full system access',
        organizationId: user.organizationId,
        permissions: {
          create: allPermissions.map((p) => ({
            permissionId: p.id,
          })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    console.log(
      `✅ Created Admin role with ${adminRole.permissions.length} permissions`,
    );
  } else {
    console.log(
      `✅ Admin role already exists with ${adminRole.permissions.length} permissions`,
    );
  }

  // Assign the Admin role to the user through UserRole
  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      roleId: adminRole.id,
      organizationId: user.organizationId,
      deletedAt: null,
    },
  });

  if (!existingUserRole) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id,
        organizationId: user.organizationId,
      },
    });
    console.log('✅ Assigned Admin role to user');
  } else {
    console.log('✅ User already has Admin role');
  }

  // Get all permissions the user now has through roles
  const userWithRoles = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      UserRoles: {
        where: {
          deletedAt: null,
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

  const permissions = userWithRoles?.UserRoles.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission.code),
  );

  console.log('\n📋 User permissions:');
  const uniquePermissions = [...new Set(permissions || [])];
  uniquePermissions.sort().forEach((p) => console.log(`  - ${p}`));

  // Check if user has contact:read permission (using colon format)
  const hasContactRead = uniquePermissions.includes('contact:read'); // ✅ Fixed: 'contacts.read' → 'contact:read'
  console.log(`\n🔍 contact:read permission: ${hasContactRead ? '✅' : '❌'}`);

  console.log('\n✅ Permission assignment complete!');
}

assignPermissions()
  .catch((error) => {
    console.error('❌ Error:', error);
  })
  .finally(() => prisma.$disconnect());
