#!/usr/bin/env ts-node
// Load environment variables BEFORE any imports
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment from .env, .env.local, .env.development in order
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), '.env.development'),
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath });
}

// Verify DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set.');
  console.error('   Please set it in .env, .env.local, or .env.development');
  console.error('   Example: DATABASE_URL="postgresql://user:password@localhost:5432/helixcrm"');
  process.exit(1);
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initializeRBACSystem() {
  console.log('🚀 Initializing RBAC System...\n');

  try {
    // 1. Create core permissions if they don't exist
    console.log('📋 Step 1: Creating core permissions...');

    const corePermissions = [
      // Contacts module
      {
        code: 'contact:read',
        name: 'Read Contacts',
        description: 'View contacts',
        module: 'contacts',
      },
      {
        code: 'contact:write',
        name: 'Write Contacts',
        description: 'Create and update contacts',
        module: 'contacts',
      },
      {
        code: 'contact:delete',
        name: 'Delete Contacts',
        description: 'Delete contacts',
        module: 'contacts',
      },

      // Deals module
      { code: 'deal:read', name: 'Read Deals', description: 'View deals', module: 'deals' },
      {
        code: 'deal:write',
        name: 'Write Deals',
        description: 'Create and update deals',
        module: 'deals',
      },
      { code: 'deal:delete', name: 'Delete Deals', description: 'Delete deals', module: 'deals' },

      // Leads module
      { code: 'lead:read', name: 'Read Leads', description: 'View leads', module: 'leads' },
      {
        code: 'lead:write',
        name: 'Write Leads',
        description: 'Create and update leads',
        module: 'leads',
      },
      { code: 'lead:delete', name: 'Delete Leads', description: 'Delete leads', module: 'leads' },

      // Pipelines module
      {
        code: 'pipeline:read',
        name: 'Read Pipelines',
        description: 'View pipelines',
        module: 'pipelines',
      },
      {
        code: 'pipeline:write',
        name: 'Write Pipelines',
        description: 'Create and update pipelines',
        module: 'pipelines',
      },
      {
        code: 'pipeline:manage',
        name: 'Manage Pipelines',
        description: 'Manage pipeline stages and settings',
        module: 'pipelines',
      },

      // Analytics module
      {
        code: 'report:read',
        name: 'Read Reports',
        description: 'View analytics data',
        module: 'analytics',
      },
      {
        code: 'report:export',
        name: 'Export Reports',
        description: 'Export analytics data',
        module: 'analytics',
      },

      // RBAC module
      {
        code: 'rbac:read',
        name: 'Read RBAC',
        description: 'View roles and permissions',
        module: 'rbac',
      },
      {
        code: 'rbac:manage',
        name: 'Manage RBAC',
        description: 'Manage roles and permissions',
        module: 'rbac',
      },

      // Dashboard module
      {
        code: 'dashboard:read',
        name: 'Read Dashboard',
        description: 'View dashboard',
        module: 'dashboard',
      },
    ];

    for (const perm of corePermissions) {
      const existing = await prisma.permission.findUnique({
        where: { code: perm.code },
      });

      if (!existing) {
        await prisma.permission.create({
          data: perm,
        });
        console.log(`  ✓ Created permission: ${perm.code}`);
      } else {
        console.log(`  • Already exists: ${perm.code}`);
      }
    }

    console.log('\n✅ Step 1 complete: Core permissions ready\n');

    // 2. Create system roles for each organization
    console.log('👥 Step 2: Creating system roles for organizations...');

    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true },
    });

    for (const org of organizations) {
      console.log(`\n  Organization: ${org.name} (${org.id.substring(0, 8)}...)`);

      // System Admin Role
      const adminRole = await prisma.role.upsert({
        where: {
          organizationId_name: {
            organizationId: org.id,
            name: 'SystemAdmin',
          },
        },
        update: {
          description: 'Full system administrator with all permissions',
          isSystem: true,
        },
        create: {
          name: 'SystemAdmin',
          description: 'Full system administrator with all permissions',
          isSystem: true,
          organizationId: org.id,
        },
      });

      // Assign all permissions to SystemAdmin
      const allPermissions = await prisma.permission.findMany();
      for (const permission of allPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        });
      }
      console.log(`    ✓ SystemAdmin role with ${allPermissions.length} permissions`);

      // Manager Role (read/write for most modules)
      const managerRole = await prisma.role.upsert({
        where: {
          organizationId_name: {
            organizationId: org.id,
            name: 'Manager',
          },
        },
        update: {
          description: 'Manager with read/write access to most resources',
          isSystem: true,
        },
        create: {
          name: 'Manager',
          description: 'Manager with read/write access to most resources',
          isSystem: true,
          organizationId: org.id,
        },
      });

      // Assign manager permissions
      const managerPermissions = await prisma.permission.findMany({
        where: {
          code: {
            in: [
              'contact:read',
              'contact:write',
              'deal:read',
              'deal:write',
              'lead:read',
              'lead:write',
              'pipeline:read',
              'pipeline:write',
              'report:read',
              'dashboard:read',
            ],
          },
        },
      });

      for (const permission of managerPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: managerRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: managerRole.id,
            permissionId: permission.id,
          },
        });
      }
      console.log(`    ✓ Manager role with ${managerPermissions.length} permissions`);

      // User Role (basic access)
      const userRole = await prisma.role.upsert({
        where: {
          organizationId_name: {
            organizationId: org.id,
            name: 'User',
          },
        },
        update: {
          description: 'Regular user with basic access',
          isSystem: true,
        },
        create: {
          name: 'User',
          description: 'Regular user with basic access',
          isSystem: true,
          organizationId: org.id,
        },
      });

      const userPermissions = await prisma.permission.findMany({
        where: {
          code: {
            in: [
              'contact:read',
              'contact:write',
              'deal:read',
              'deal:write',
              'lead:read',
              'lead:write',
              'dashboard:read',
            ],
          },
        },
      });

      for (const permission of userPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: userRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: userRole.id,
            permissionId: permission.id,
          },
        });
      }
      console.log(`    ✓ User role with ${userPermissions.length} permissions`);

      // Viewer Role (read-only)
      const viewerRole = await prisma.role.upsert({
        where: {
          organizationId_name: {
            organizationId: org.id,
            name: 'Viewer',
          },
        },
        update: {
          description: 'Viewer with read-only access',
          isSystem: true,
        },
        create: {
          name: 'Viewer',
          description: 'Viewer with read-only access',
          isSystem: true,
          organizationId: org.id,
        },
      });

      const viewerPermissions = await prisma.permission.findMany({
        where: {
          code: {
            in: [
              'contact:read',
              'deal:read',
              'lead:read',
              'pipeline:read',
              'report:read',
              'dashboard:read',
            ],
          },
        },
      });

      for (const permission of viewerPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: viewerRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: viewerRole.id,
            permissionId: permission.id,
          },
        });
      }
      console.log(`    ✓ Viewer role with ${viewerPermissions.length} permissions`);
    }

    console.log('\n✅ Step 2 complete: System roles created for all organizations\n');

    // 3. Assign SystemAdmin role to existing admin users
    console.log('👤 Step 3: Assigning SystemAdmin role to existing admins...');

    const adminUsers = await prisma.user.findMany({
      where: { role: 'admin' },
      include: { organization: true },
    });

    for (const user of adminUsers) {
      const adminRole = await prisma.role.findFirst({
        where: {
          organizationId: user.organizationId,
          name: 'SystemAdmin',
        },
      });

      if (adminRole) {
        const existingAssignment = await prisma.userRole.findFirst({
          where: {
            userId: user.id,
            roleId: adminRole.id,
            organizationId: user.organizationId,
          },
        });

        if (!existingAssignment) {
          await prisma.userRole.create({
            data: {
              userId: user.id,
              roleId: adminRole.id,
              organizationId: user.organizationId,
            },
          });
          console.log(`  ✓ Assigned SystemAdmin to ${user.email}`);
        } else {
          console.log(`  • Already assigned: ${user.email}`);
        }
      }
    }

    console.log('\n✅ Step 3 complete: Admin users assigned\n');

    // 4. Summary
    console.log('📊 RBAC System Summary:');
    console.log('=======================');

    const permissionCount = await prisma.permission.count();
    const roleCount = await prisma.role.count();
    const userRoleCount = await prisma.userRole.count();

    console.log(`Total Permissions: ${permissionCount}`);
    console.log(`Total Roles: ${roleCount}`);
    console.log(`Total User-Role Assignments: ${userRoleCount}`);

    const orgs = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            Role: true,
            User: true,
          },
        },
      },
    });

    console.log('\nBy Organization:');
    orgs.forEach((org) => {
      console.log(`  ${org.name}:`);
      console.log(`    • Users: ${org._count.User}`);
      console.log(`    • Roles: ${org._count.Role}`);
    });

    console.log('\n🎉 RBAC System initialization complete!');
    console.log('\nNext steps:');
    console.log('1. Restart the API server');
    console.log('2. Test with different user roles');
    console.log('3. Verify JWT contains permissions array');
  } catch (error) {
    console.error('❌ Error initializing RBAC system:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
      console.error('Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  initializeRBACSystem();
}
