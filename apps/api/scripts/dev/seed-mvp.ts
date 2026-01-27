#!/usr/bin/env ts-node
import { PrismaClient, DealStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedMVP() {
  console.log('Ì∫Ä HELIXCRM MVP SEED SCRIPT');
  console.log('==============================\n');

  try {
    // Clean up existing test data (optional)
    console.log('Ì∑π Cleaning up existing test data...');
    await prisma.deal.deleteMany({ where: { name: { contains: 'Test' } } });
    await prisma.contact.deleteMany({ where: { email: { contains: 'test' } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'test' } } });
    await prisma.organization.deleteMany({ where: { name: { contains: 'Test' } } });

    // ==================== ORGANIZATION 1 ====================
    console.log('\nÌø¢ ORGANIZATION 1: Tech Solutions Inc.');
    console.log('----------------------------------------');
    
    const org1 = await prisma.organization.create({
      data: {
        name: 'Tech Solutions Inc.',
        slug: 'techsolutions',
        status: 'active',
      },
    });
    console.log(`‚úÖ Created organization: ${org1.name} (ID: ${org1.id})`);

    // Create SystemAdmin role for org1
    const systemAdminRole1 = await prisma.role.create({
      data: {
        name: 'SystemAdmin',
        description: 'Full system administrator',
        isSystem: true,
        organizationId: org1.id,
      },
    });

    // Assign all permissions to SystemAdmin role
    const allPermissions = await prisma.permission.findMany();
    for (const permission of allPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: systemAdminRole1.id,
          permissionId: permission.id,
        },
      });
    }
    console.log(`‚úÖ Created SystemAdmin role with ${allPermissions.length} permissions`);

    // Create admin user for org1
    const adminPassword1 = await bcrypt.hash('Admin123!', 10);
    const adminUser1 = await prisma.user.create({
      data: {
        email: 'admin@techsolutions.com',
        passwordHash: adminPassword1,
        firstName: 'Alex',
        lastName: 'Johnson',
        organizationId: org1.id,
        isActive: true,
        tokenVersion: 1,
      },
    });

    // Assign SystemAdmin role to admin user
    await prisma.userRole.create({
      data: {
        userId: adminUser1.id,
        roleId: systemAdminRole1.id,
        organizationId: org1.id,
      },
    });
    console.log(`‚úÖ Created admin user: ${adminUser1.email}`);

    // Create pipeline for org1
    const pipeline1 = await prisma.pipeline.create({
      data: {
        name: 'Sales Pipeline',
        description: 'Main sales pipeline',
        isDefault: true,
        organizationId: org1.id,
      },
    });

    // Create pipeline stages
    const stages1 = await Promise.all([
      prisma.pipelineStage.create({
        data: {
          name: 'Prospecting',
          order: 1,
          probability: 10,
          pipelineId: pipeline1.id,
        },
      }),
      prisma.pipelineStage.create({
        data: {
          name: 'Qualification',
          order: 2,
          probability: 25,
          pipelineId: pipeline1.id,
        },
      }),
      prisma.pipelineStage.create({
        data: {
          name: 'Proposal',
          order: 3,
          probability: 50,
          pipelineId: pipeline1.id,
        },
      }),
      prisma.pipelineStage.create({
        data: {
          name: 'Closed Won',
          order: 4,
          probability: 100,
          pipelineId: pipeline1.id,
        },
      }),
    ]);
    console.log(`‚úÖ Created pipeline with ${stages1.length} stages`);

    // Create contacts for org1
    const contacts1 = await Promise.all([
      prisma.contact.create({
        data: {
          firstName: 'Sarah',
          lastName: 'Miller',
          email: 'sarah@client1.com',
          phone: '+1-555-1001',
          organizationId: org1.id,
        },
      }),
      prisma.contact.create({
        data: {
          firstName: 'David',
          lastName: 'Chen',
          email: 'david@client2.com',
          phone: '+1-555-1002',
          organizationId: org1.id,
        },
      }),
    ]);

    // Create deals for org1
    const deals1 = await Promise.all([
      prisma.deal.create({
        data: {
          name: 'Enterprise CRM License',
          amount: 75000.00,
          currency: 'USD',
          status: DealStatus.open,
          probability: 50,
          expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          pipelineId: pipeline1.id,
          stageId: stages1[2].id,
          contactId: contacts1[0].id,
          ownerUserId: adminUser1.id,
          organizationId: org1.id,
        },
      }),
      prisma.deal.create({
        data: {
          name: 'Custom Integration',
          amount: 45000.00,
          currency: 'USD',
          status: DealStatus.open,
          probability: 25,
          expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          pipelineId: pipeline1.id,
          stageId: stages1[1].id,
          contactId: contacts1[1].id,
          ownerUserId: adminUser1.id,
          organizationId: org1.id,
        },
      }),
    ]);
    console.log(`‚úÖ Created ${contacts1.length} contacts and ${deals1.length} deals`);

    // ==================== ORGANIZATION 2 ====================
    console.log('\nÌø¢ ORGANIZATION 2: Marketing Pros LLC');
    console.log('----------------------------------------');
    
    const org2 = await prisma.organization.create({
      data: {
        name: 'Marketing Pros LLC',
        slug: 'marketingpros',
        status: 'active',
      },
    });
    console.log(`‚úÖ Created organization: ${org2.name} (ID: ${org2.id})`);

    // Create SystemAdmin role for org2
    const systemAdminRole2 = await prisma.role.create({
      data: {
        name: 'SystemAdmin',
        description: 'Full system administrator',
        isSystem: true,
        organizationId: org2.id,
      },
    });

    // Assign all permissions to SystemAdmin role
    for (const permission of allPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: systemAdminRole2.id,
          permissionId: permission.id,
        },
      });
    }
    console.log(`‚úÖ Created SystemAdmin role with ${allPermissions.length} permissions`);

    // Create admin user for org2
    const adminPassword2 = await bcrypt.hash('Admin123!', 10);
    const adminUser2 = await prisma.user.create({
      data: {
        email: 'admin@marketingpros.com',
        passwordHash: adminPassword2,
        firstName: 'Maria',
        lastName: 'Garcia',
        organizationId: org2.id,
        isActive: true,
        tokenVersion: 1,
      },
    });

    // Assign SystemAdmin role to admin user
    await prisma.userRole.create({
      data: {
        userId: adminUser2.id,
        roleId: systemAdminRole2.id,
        organizationId: org2.id,
      },
    });
    console.log(`‚úÖ Created admin user: ${adminUser2.email}`);

    // Create pipeline for org2
    const pipeline2 = await prisma.pipeline.create({
      data: {
        name: 'Marketing Campaigns',
        description: 'Marketing campaign pipeline',
        isDefault: true,
        organizationId: org2.id,
      },
    });

    // Create pipeline stages
    const stages2 = await Promise.all([
      prisma.pipelineStage.create({
        data: {
          name: 'Lead Generation',
          order: 1,
          probability: 20,
          pipelineId: pipeline2.id,
        },
      }),
      prisma.pipelineStage.create({
        data: {
          name: 'Campaign Planning',
          order: 2,
          probability: 40,
          pipelineId: pipeline2.id,
        },
      }),
      prisma.pipelineStage.create({
        data: {
          name: 'Execution',
          order: 3,
          probability: 70,
          pipelineId: pipeline2.id,
        },
      }),
      prisma.pipelineStage.create({
        data: {
          name: 'Completed',
          order: 4,
          probability: 100,
          pipelineId: pipeline2.id,
        },
      }),
    ]);
    console.log(`‚úÖ Created pipeline with ${stages2.length} stages`);

    // Create contacts for org2
    const contacts2 = await Promise.all([
      prisma.contact.create({
        data: {
          firstName: 'James',
          lastName: 'Wilson',
          email: 'james@client3.com',
          phone: '+1-555-2001',
          organizationId: org2.id,
        },
      }),
      prisma.contact.create({
        data: {
          firstName: 'Lisa',
          lastName: 'Taylor',
          email: 'lisa@client4.com',
          phone: '+1-555-2002',
          organizationId: org2.id,
        },
      }),
    ]);

    // Create deals for org2
    const deals2 = await Promise.all([
      prisma.deal.create({
        data: {
          name: 'Social Media Campaign',
          amount: 25000.00,
          currency: 'USD',
          status: DealStatus.open,
          probability: 40,
          expectedCloseDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          pipelineId: pipeline2.id,
          stageId: stages2[1].id,
          contactId: contacts2[0].id,
          ownerUserId: adminUser2.id,
          organizationId: org2.id,
        },
      }),
      prisma.deal.create({
        data: {
          name: 'SEO Optimization',
          amount: 18000.00,
          currency: 'USD',
          status: DealStatus.won,
          probability: 100,
          expectedCloseDate: new Date(),
          closedAt: new Date(),
          pipelineId: pipeline2.id,
          stageId: stages2[3].id,
          contactId: contacts2[1].id,
          ownerUserId: adminUser2.id,
          organizationId: org2.id,
        },
      }),
    ]);
    console.log(`‚úÖ Created ${contacts2.length} contacts and ${deals2.length} deals`);

    // ==================== SUMMARY ====================
    console.log('\nÌæâ MVP SEED COMPLETE!');
    console.log('=====================');
    console.log(`Ìø¢ Organizations: 2`);
    console.log(`Ì±• Users: 2 (SystemAdmin each)`);
    console.log(`Ì≥á Contacts: 4 (2 per org)`);
    console.log(`Ì≥ä Pipelines: 2 (with 4 stages each)`);
    console.log(`Ì≤∞ Deals: 4 (2 per org, including 1 won deal)`);
    console.log(`Ì¥ê Permissions: ${allPermissions.length} total`);
    
    console.log('\nÌ¥ë TEST CREDENTIALS:');
    console.log('Organization 1:');
    console.log(`   Email: admin@techsolutions.com`);
    console.log(`   Password: Admin123!`);
    console.log(`   Org ID: ${org1.id}`);
    
    console.log('\nOrganization 2:');
    console.log(`   Email: admin@marketingpros.com`);
    console.log(`   Password: Admin123!`);
    console.log(`   Org ID: ${org2.id}`);

    console.log('\nÌ∫Ä NEXT STEPS:');
    console.log('1. Login with either admin account');
    console.log('2. Test endpoints with the JWT token');
    console.log('3. Verify data isolation between organizations');
    console.log('4. Run validation tests');

  } catch (error) {
    console.error('‚ùå Seed script error:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedMVP();
}
