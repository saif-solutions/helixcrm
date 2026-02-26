import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Phase 3 seed script...');

  // ==================== GLOBAL PERMISSIONS ====================
  console.log('📝 Creating global permissions...');
  
  const DEFAULT_PERMISSIONS = [
    // Deals module
    { code: 'deals.read', name: 'View Deals', module: 'deals' },
    { code: 'deals.write', name: 'Create/Edit Deals', module: 'deals' },
    { code: 'deals.delete', name: 'Delete Deals', module: 'deals' },
    
    // Pipelines module
    { code: 'pipelines.read', name: 'View Pipelines', module: 'pipelines' },
    { code: 'pipelines.write', name: 'Create/Edit Pipelines', module: 'pipelines' },
    { code: 'pipelines.manage', name: 'Manage Pipelines', module: 'pipelines' },
    
    // Analytics module
    { code: 'analytics.read', name: 'View Analytics', module: 'analytics' },
    { code: 'analytics.export', name: 'Export Analytics', module: 'analytics' },
    
    // RBAC module
    { code: 'rbac.read', name: 'View Roles & Permissions', module: 'rbac' },
    { code: 'rbac.manage', name: 'Manage Roles & Permissions', module: 'rbac' },
    
    // Contacts module
    { code: 'contacts.read', name: 'View Contacts', module: 'contacts' },
    { code: 'contacts.write', name: 'Create/Edit Contacts', module: 'contacts' },
    { code: 'contacts.delete', name: 'Delete Contacts', module: 'contacts' },
    
    // Leads module
    { code: 'leads.read', name: 'View Leads', module: 'leads' },
    { code: 'leads.write', name: 'Create/Edit Leads', module: 'leads' },
    { code: 'leads.delete', name: 'Delete Leads', module: 'leads' },
    
    // Accounts module
    { code: 'accounts.read', name: 'View Accounts', module: 'accounts' },
    { code: 'accounts.write', name: 'Create/Edit Accounts', module: 'accounts' },
    { code: 'accounts.delete', name: 'Delete Accounts', module: 'accounts' },
    
    // Activities module
    { code: 'activities.read', name: 'View Activities', module: 'activities' },
    { code: 'activities.write', name: 'Create/Edit Activities', module: 'activities' },
    { code: 'activities.delete', name: 'Delete Activities', module: 'activities' },
    
    // Users module (admin only)
    { code: 'users.read', name: 'View Users', module: 'users' },
    { code: 'users.write', name: 'Create/Edit Users', module: 'users' },
    { code: 'users.delete', name: 'Delete Users', module: 'users' },
  ];

  // Create permissions (skip if already exists)
  for (const perm of DEFAULT_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: perm,
      create: perm,
    });
  }

  console.log(`✅ Created ${DEFAULT_PERMISSIONS.length} global permissions`);

  // ==================== DEFAULT PIPELINE STAGES ====================
  console.log('📋 Default pipeline stages configuration...');
  
  const DEFAULT_PIPELINE_STAGES = [
    { order: 1, name: 'Qualification', probability: 10 },
    { order: 2, name: 'Needs Analysis', probability: 25 },
    { order: 3, name: 'Proposal', probability: 50 },
    { order: 4, name: 'Negotiation', probability: 75 },
    { order: 5, name: 'Closed Won', probability: 100 },
    { order: 6, name: 'Closed Lost', probability: 0 },
  ];

  console.log(`📊 Default stages: ${DEFAULT_PIPELINE_STAGES.map(s => s.name).join(', ')}`);

  // ==================== SETUP FOR EACH ORGANIZATION ====================
  console.log('🏢 Setting up Phase 3 for existing organizations...');
  
  const organizations = await prisma.organization.findMany();

  console.log(`📊 Found ${organizations.length} organizations to setup`);

  for (const org of organizations) {
    console.log(`\n🔧 Setting up organization: ${org.name} (${org.id})`);
    
    // Find organization admin
    const adminUser = await prisma.user.findFirst({
      where: {
        organizationId: org.id,
        role: 'admin',
      },
    });
    
    // 1. Check if organization already has a default pipeline
    const existingPipeline = await prisma.pipeline.findFirst({
      where: {
        organizationId: org.id,
        isDefault: true,
      },
    });

    if (existingPipeline) {
      console.log(`   ⏩ Organization already has default pipeline: ${existingPipeline.name}`);
    } else {
      // 2. Create default pipeline
      console.log(`   📊 Creating default pipeline...`);
      
      const pipeline = await prisma.pipeline.create({
        data: {
          name: 'Default Sales Pipeline',
          description: 'Standard sales pipeline with qualification to close stages',
          isDefault: true,
          organizationId: org.id,
        },
      });

      // 3. Create pipeline stages
      console.log(`   📋 Creating ${DEFAULT_PIPELINE_STAGES.length} pipeline stages...`);
      
      for (const stage of DEFAULT_PIPELINE_STAGES) {
        await prisma.pipelineStage.create({
          data: {
            ...stage,
            pipelineId: pipeline.id,
          },
        });
      }

      console.log(`   ✅ Created default pipeline "${pipeline.name}" with ${DEFAULT_PIPELINE_STAGES.length} stages`);
    }

    // 4. Create system roles for organization
    console.log(`   👥 Creating system roles...`);
    
    const SYSTEM_ROLES = [
      {
        name: 'Admin',
        isSystem: true,
        permissions: [
          'deals.read', 'deals.write', 'deals.delete',
          'pipelines.read', 'pipelines.write', 'pipelines.manage',
          'analytics.read', 'analytics.export',
          'rbac.read', 'rbac.manage',
          'contacts.read', 'contacts.write', 'contacts.delete',
          'leads.read', 'leads.write', 'leads.delete',
          'accounts.read', 'accounts.write', 'accounts.delete',
          'activities.read', 'activities.write', 'activities.delete',
          'users.read', 'users.write', 'users.delete',
        ]
      },
      {
        name: 'Sales Manager',
        isSystem: true,
        permissions: [
          'deals.read', 'deals.write',
          'pipelines.read',
          'analytics.read',
          'contacts.read', 'contacts.write',
          'leads.read', 'leads.write',
          'accounts.read', 'accounts.write',
          'activities.read', 'activities.write',
        ]
      },
      {
        name: 'Sales Rep',
        isSystem: true,
        permissions: [
          'deals.read', 'deals.write',
          'pipelines.read',
          'contacts.read', 'contacts.write',
          'leads.read', 'leads.write',
          'accounts.read',
          'activities.read', 'activities.write',
        ]
      },
      {
        name: 'Viewer',
        isSystem: true,
        permissions: [
          'deals.read',
          'pipelines.read',
          'analytics.read',
          'contacts.read',
          'leads.read',
          'accounts.read',
          'activities.read',
        ]
      }
    ];

    // Create roles and assign permissions
    for (const roleConfig of SYSTEM_ROLES) {
      // Check if role already exists
      const existingRole = await prisma.role.findFirst({
        where: {
          organizationId: org.id,
          name: roleConfig.name,
        },
      });

      if (existingRole) {
        console.log(`   ⏩ Role "${roleConfig.name}" already exists`);
        continue;
      }

      // Create role
      const role = await prisma.role.create({
        data: {
          name: roleConfig.name,
          description: `System ${roleConfig.name} role`,
          isSystem: roleConfig.isSystem,
          organizationId: org.id,
        },
      });

      console.log(`   ✅ Created role: ${role.name}`);

      // Assign permissions to role
      for (const permCode of roleConfig.permissions) {
        const permission = await prisma.permission.findUnique({
          where: { code: permCode },
        });

        if (permission) {
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: permission.id,
            },
          });
        } else {
          console.warn(`   ⚠️ Permission not found: ${permCode}`);
        }
      }

      console.log(`   📋 Assigned ${roleConfig.permissions.length} permissions to ${role.name}`);

      // Assign Admin role to organization creator (first admin user)
      if (roleConfig.name === 'Admin' && adminUser) {
        await prisma.userRole.create({
          data: {
            userId: adminUser.id,
            roleId: role.id,
            organizationId: org.id,
          },
        });
        
        console.log(`   👑 Assigned Admin role to user: ${adminUser.email}`);
      }
    }

    console.log(`   🎉 Organization setup complete: ${org.name}`);
  }

  // ==================== TEST DATA (Optional - for development) ====================
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n🧪 Creating test data for development...');
    
    // Find an organization with an admin user to create test deals
    const testOrg = await prisma.organization.findFirst();
    
    if (testOrg) {
      const adminUser = await prisma.user.findFirst({
        where: {
          organizationId: testOrg.id,
          role: 'admin',
        },
      });

      const defaultPipeline = await prisma.pipeline.findFirst({
        where: {
          organizationId: testOrg.id,
          isDefault: true,
        },
        include: {
          stages: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      if (adminUser && defaultPipeline) {
        const firstStage = defaultPipeline.stages[0];

        // Create a test contact
        const testContact = await prisma.contact.create({
          data: {
            firstName: 'Test',
            lastName: 'Contact',
            email: 'test.contact@example.com',
            organizationId: testOrg.id,
          },
        });

        // Create a test account
        const testAccount = await prisma.account.create({
          data: {
            name: 'Test Account Inc.',
            industry: 'Technology',
            organizationId: testOrg.id,
          },
        });

        // Create test deals
        const TEST_DEALS = [
          {
            name: 'Enterprise CRM Deal',
            amount: 50000.00,
            probability: firstStage.probability,
            expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          },
          {
            name: 'SMB Integration Project',
            amount: 15000.00,
            probability: firstStage.probability,
            expectedCloseDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
          },
          {
            name: 'Custom Development',
            amount: 25000.00,
            probability: firstStage.probability,
            expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
          },
        ];

        for (const dealData of TEST_DEALS) {
          await prisma.deal.create({
            data: {
              ...dealData,
              organizationId: testOrg.id,
              pipelineId: defaultPipeline.id,
              stageId: firstStage.id,
              contactId: testContact.id,
              accountId: testAccount.id,
              ownerUserId: adminUser.id,
              currency: 'USD',
              status: 'open',
            },
          });
        }

        console.log(`   ✅ Created ${TEST_DEALS.length} test deals in organization: ${testOrg.name}`);
      } else {
        console.log('   ⏩ Skipping test data: No admin user or default pipeline found');
      }
    }
  }

  console.log('\n🎉 Phase 3 seed script completed successfully!');
  console.log('📊 Summary:');
  console.log(`   - ${DEFAULT_PERMISSIONS.length} global permissions created`);
  console.log(`   - ${organizations.length} organizations configured`);
  console.log(`   - Default pipeline with ${DEFAULT_PIPELINE_STAGES.length} stages created per org`);
  console.log(`   - 4 system roles created per org (Admin, Sales Manager, Sales Rep, Viewer)`);
}

main()
  .catch((e) => {
    console.error('❌ Seed script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });