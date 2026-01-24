// apps/api/scripts/assign-rbac-permissions.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignRBACPermissions() {
  try {
    console.log('Assigning RBAC permissions to test user...');
    
    // Find test user
    const user = await prisma.user.findUnique({
      where: { email: 'testuser@example.com' },
      include: { organization: true },
    });

    if (!user) {
      console.error('Test user not found');
      return;
    }

    console.log(`Found user: ${user.email} in organization: ${user.organization.name}`);

    // Check if SystemAdmin role exists, create if not
    let systemAdminRole = await prisma.role.findFirst({
      where: { 
        name: 'SystemAdmin',
        organizationId: user.organizationId,
      },
    });

    if (!systemAdminRole) {
      console.log('Creating SystemAdmin role...');
      
      // First create permissions if they don't exist
      const permissionsToCreate = [
        // RBAC permissions
        { code: 'rbac.read', name: 'Read RBAC', description: 'Read role-based access control', module: 'rbac' },
        { code: 'rbac.manage', name: 'Manage RBAC', description: 'Manage role-based access control', module: 'rbac' },
        // Deal permissions
        { code: 'deals.read', name: 'Read Deals', description: 'Read deals', module: 'deals' },
        { code: 'deals.write', name: 'Write Deals', description: 'Create and update deals', module: 'deals' },
        { code: 'deals.delete', name: 'Delete Deals', description: 'Delete deals', module: 'deals' },
        // Contact permissions
        { code: 'contacts.read', name: 'Read Contacts', description: 'Read contacts', module: 'contacts' },
        { code: 'contacts.write', name: 'Write Contacts', description: 'Create and update contacts', module: 'contacts' },
        { code: 'contacts.delete', name: 'Delete Contacts', description: 'Delete contacts', module: 'contacts' },
        // Lead permissions
        { code: 'leads.read', name: 'Read Leads', description: 'Read leads', module: 'leads' },
        { code: 'leads.write', name: 'Write Leads', description: 'Create and update leads', module: 'leads' },
        { code: 'leads.delete', name: 'Delete Leads', description: 'Delete leads', module: 'leads' },
        // Pipeline permissions
        { code: 'pipelines.read', name: 'Read Pipelines', description: 'Read pipelines', module: 'pipelines' },
        { code: 'pipelines.write', name: 'Write Pipelines', description: 'Create and update pipelines', module: 'pipelines' },
        { code: 'pipelines.manage', name: 'Manage Pipelines', description: 'Manage pipelines', module: 'pipelines' },
        // Analytics permissions
        { code: 'analytics.read', name: 'Read Analytics', description: 'Read analytics', module: 'analytics' },
        { code: 'analytics.export', name: 'Export Analytics', description: 'Export analytics data', module: 'analytics' },
        { code: 'analytics.manage', name: 'Manage Analytics', description: 'Manage analytics', module: 'analytics' },
      ];

      // Create permissions
      const createdPermissions = [];
      for (const perm of permissionsToCreate) {
        let permission = await prisma.permission.findUnique({
          where: { code: perm.code },
        });
        
        if (!permission) {
          permission = await prisma.permission.create({
            data: perm,
          });
          console.log(`Created permission: ${perm.code}`);
        }
        createdPermissions.push(permission);
      }

      // Create role with permissions
      systemAdminRole = await prisma.role.create({
        data: {
          name: 'SystemAdmin',
          description: 'Full system administrator with all permissions',
          organizationId: user.organizationId,
          isSystem: true,
          permissions: {
            create: createdPermissions.map(permission => ({
              permissionId: permission.id,
            })),
          },
        },
      });
      console.log('Created SystemAdmin role with all permissions');
    }

    // Assign role to user
    const existingAssignment = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        roleId: systemAdminRole.id,
        organizationId: user.organizationId,
      },
    });

    if (!existingAssignment) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: systemAdminRole.id,
          organizationId: user.organizationId,
        },
      });
      console.log('Assigned SystemAdmin role to test user');
    } else {
      console.log('User already has SystemAdmin role');
    }

    // Verify permissions
    const userWithRoles = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
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

    const permissionCount = userWithRoles?.UserRoles.reduce(
      (count, userRole) => count + userRole.role.permissions.length,
      0
    );

    console.log(`\n✅ RBAC setup complete!`);
    console.log(`User: ${user.email}`);
    console.log(`Role: SystemAdmin`);
    console.log(`Permissions granted: ${permissionCount}`);
    
    // List permissions
    if (userWithRoles?.UserRoles) {
      console.log('\nGranted permissions:');
      userWithRoles.UserRoles.forEach(userRole => {
        userRole.role.permissions.forEach(rolePerm => {
          console.log(`  - ${rolePerm.permission.code} (${rolePerm.permission.module})`);
        });
      });
    }

    console.log('\nNow test RBAC endpoint with token...');

  } catch (error) {
    console.error('Error setting up RBAC:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

assignRBACPermissions();