#!/usr/bin/env ts-node
import { PrismaClient, LeadStatus, DealStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedDatabase() {
  console.log('Ìº± Seeding database with dummy data...\n');

  try {
    // 1. Create Organization
    console.log('Ì≥ã Step 1: Creating organization...');
    const organization = await prisma.organization.create({
      data: {
        name: 'Acme Corporation',
        slug: 'acme-corp',
        status: 'active',
      },
    });
    console.log(`  ‚úì Created organization: ${organization.name}`);

    // 2. Create Users with different roles
    console.log('\nÌ±• Step 2: Creating users...');
    
    const adminPassword = await bcrypt.hash('Admin123!', 10);
    const managerPassword = await bcrypt.hash('Manager123!', 10);
    const userPassword = await bcrypt.hash('User123!', 10);
    const viewerPassword = await bcrypt.hash('Viewer123!', 10);

    const users = await Promise.all([
      prisma.user.create({
        data: {
          email: 'admin@acme.com',
          passwordHash: adminPassword,
          firstName: 'Alice',
          lastName: 'Admin',
          organizationId: organization.id,
          isActive: true,
          role: 'admin',
          tokenVersion: 1,
        },
      }),
      prisma.user.create({
        data: {
          email: 'manager@acme.com',
          passwordHash: managerPassword,
          firstName: 'Bob',
          lastName: 'Manager',
          organizationId: organization.id,
          isActive: true,
          role: 'user',
          tokenVersion: 1,
        },
      }),
      prisma.user.create({
        data: {
          email: 'user@acme.com',
          passwordHash: userPassword,
          firstName: 'Charlie',
          lastName: 'User',
          organizationId: organization.id,
          isActive: true,
          role: 'user',
          tokenVersion: 1,
        },
      }),
      prisma.user.create({
        data: {
          email: 'viewer@acme.com',
          passwordHash: viewerPassword,
          firstName: 'Diana',
          lastName: 'Viewer',
          organizationId: organization.id,
          isActive: true,
          role: 'user',
          tokenVersion: 1,
        },
      }),
    ]);

    users.forEach(user => {
      console.log(`  ‚úì Created user: ${user.email} (${user.firstName} ${user.lastName})`);
    });

    // 3. Create Contacts
    console.log('\nÌ≥á Step 3: Creating contacts...');
    const contacts = await Promise.all([
      prisma.contact.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@client.com',
          phone: '+1-555-0101',
          company: 'Tech Solutions Inc.',
          organizationId: organization.id,
        },
      }),
      prisma.contact.create({
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@partner.com',
          phone: '+1-555-0102',
          company: 'Innovation Partners',
          organizationId: organization.id,
        },
      }),
      prisma.contact.create({
        data: {
          firstName: 'Robert',
          lastName: 'Brown',
          email: 'robert.brown@vendor.com',
          phone: '+1-555-0103',
          company: 'Cloud Services Ltd',
          organizationId: organization.id,
        },
      }),
    ]);

    contacts.forEach(contact => {
      console.log(`  ‚úì Created contact: ${contact.firstName} ${contact.lastName} (${contact.company})`);
    });

    // 4. Create Account
    console.log('\nÌø¢ Step 4: Creating account...');
    const account = await prisma.account.create({
      data: {
        name: 'Enterprise Client Corp',
        industry: 'Technology',
        website: 'https://enterpriseclient.com',
        phone: '+1-800-555-1234',
        email: 'info@enterpriseclient.com',
        organizationId: organization.id,
      },
    });
    console.log(`  ‚úì Created account: ${account.name}`);

    // 5. Create Leads
    console.log('\nÌæØ Step 5: Creating leads...');
    const leads = await Promise.all([
      prisma.lead.create({
        data: {
          name: 'Michael Johnson',
          email: 'lead1@prospect.com',
          phone: '+1-555-0201',
          status: LeadStatus.new,
          organizationId: organization.id,
        },
      }),
      prisma.lead.create({
        data: {
          name: 'Sarah Williams',
          email: 'lead2@prospect.com',
          phone: '+1-555-0202',
          status: LeadStatus.contacted,
          organizationId: organization.id,
        },
      }),
    ]);

    leads.forEach(lead => {
      console.log(`  ‚úì Created lead: ${lead.name} (${lead.status})`);
    });

    // 6. Create Pipeline
    console.log('\nÌ≥ä Step 6: Creating pipeline...');
    const pipeline = await prisma.pipeline.create({
      data: {
        name: 'Default Sales Pipeline',
        description: 'Main sales pipeline for all deals',
        isDefault: true,
        organizationId: organization.id,
      },
    });
    console.log(`  ‚úì Created pipeline: ${pipeline.name}`);

    // 7. Create Pipeline Stages
    console.log('\nÌ≥à Step 7: Creating pipeline stages...');
    const stages = await Promise.all([
      prisma.pipelineStage.create({
        data: {
          name: 'Prospecting',
          description: 'Initial contact and qualification',
          order: 1,
          probability: 10,
          pipelineId: pipeline.id,
        },
      }),
      prisma.pipelineStage.create({
        data: {
          name: 'Qualification',
          description: 'Needs analysis and fit assessment',
          order: 2,
          probability: 25,
          pipelineId: pipeline.id,
        },
      }),
      prisma.pipelineStage.create({
        data: {
          name: 'Proposal',
          description: 'Solution presentation and quoting',
          order: 3,
          probability: 50,
          pipelineId: pipeline.id,
        },
      }),
      prisma.pipelineStage.create({
        data: {
          name: 'Negotiation',
          description: 'Contract review and final terms',
          order: 4,
          probability: 75,
          pipelineId: pipeline.id,
        },
      }),
      prisma.pipelineStage.create({
        data: {
          name: 'Closed Won',
          description: 'Deal successfully closed',
          order: 5,
          probability: 100,
          pipelineId: pipeline.id,
        },
      }),
      prisma.pipelineStage.create({
        data: {
          name: 'Closed Lost',
          description: 'Deal lost to competition',
          order: 6,
          probability: 0,
          pipelineId: pipeline.id,
        },
      }),
    ]);

    stages.forEach(stage => {
      console.log(`  ‚úì Created stage: ${stage.name} (${stage.probability}% probability)`);
    });

    // 8. Create Deals
    console.log('\nÌ≤∞ Step 8: Creating deals...');
    const deals = await Promise.all([
      prisma.deal.create({
        data: {
          name: 'Enterprise Software License',
          amount: 50000.00,
          currency: 'USD',
          status: DealStatus.open,
          probability: 50,
          expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          pipelineId: pipeline.id,
          stageId: stages[2].id, // Proposal stage
          contactId: contacts[0].id,
          accountId: account.id,
          ownerUserId: users[0].id,
          organizationId: organization.id,
        },
      }),
      prisma.deal.create({
        data: {
          name: 'Cloud Migration Project',
          amount: 120000.00,
          currency: 'USD',
          status: DealStatus.open,
          probability: 25,
          expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          pipelineId: pipeline.id,
          stageId: stages[1].id, // Qualification stage
          contactId: contacts[1].id,
          ownerUserId: users[1].id,
          organizationId: organization.id,
        },
      }),
      prisma.deal.create({
        data: {
          name: 'Consulting Services',
          amount: 75000.00,
          currency: 'USD',
          status: DealStatus.won,
          probability: 100,
          closedAt: new Date(),
          expectedCloseDate: new Date(),
          pipelineId: pipeline.id,
          stageId: stages[4].id, // Closed Won
          contactId: contacts[2].id,
          accountId: account.id,
          ownerUserId: users[2].id,
          organizationId: organization.id,
        },
      }),
      prisma.deal.create({
        data: {
          name: 'Website Redesign',
          amount: 25000.00,
          currency: 'USD',
          status: DealStatus.lost,
          probability: 0,
          closedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          expectedCloseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          pipelineId: pipeline.id,
          stageId: stages[5].id, // Closed Lost
          contactId: contacts[0].id,
          ownerUserId: users[0].id,
          organizationId: organization.id,
        },
      }),
    ]);

    deals.forEach(deal => {
      console.log(`  ‚úì Created deal: ${deal.name} (${deal.status}, $${deal.amount})`);
    });

    // 9. Create Deal Stage History
    console.log('\nÌµ∞Ô∏è Step 9: Creating deal stage history...');
    await prisma.dealStageHistory.createMany({
      data: [
        {
          dealId: deals[0].id,
          fromStageId: stages[0].id,
          toStageId: stages[1].id,
          changedByUserId: users[0].id,
        },
        {
          dealId: deals[0].id,
          fromStageId: stages[1].id,
          toStageId: stages[2].id,
          changedByUserId: users[0].id,
        },
        {
          dealId: deals[1].id,
          fromStageId: stages[0].id,
          toStageId: stages[1].id,
          changedByUserId: users[1].id,
        },
      ],
    });
    console.log('  ‚úì Created 3 deal stage history entries');

    // 10. Create Audit Logs
    console.log('\nÌ≥ù Step 10: Creating audit logs...');
    await prisma.auditLog.createMany({
      data: [
        {
          action: 'USER_LOGIN',
          entity: 'User',
          entityId: users[0].id,
          userId: users[0].id,
          organizationId: organization.id,
          severity: 'info',
          before: null,
          after: JSON.stringify({ lastLogin: new Date().toISOString() }),
        },
        {
          action: 'DEAL_CREATED',
          entity: 'Deal',
          entityId: deals[0].id,
          userId: users[0].id,
          organizationId: organization.id,
          severity: 'info',
          before: null,
          after: JSON.stringify({ name: deals[0].name, amount: deals[0].amount }),
        },
      ],
    });
    console.log('  ‚úì Created 2 audit log entries');

    console.log('\n‚úÖ Database seeding complete!');
    console.log('\nÌ≥ä Summary:');
    console.log(`   ‚Ä¢ Organizations: 1`);
    console.log(`   ‚Ä¢ Users: 4 (admin, manager, user, viewer)`);
    console.log(`   ‚Ä¢ Contacts: 3`);
    console.log(`   ‚Ä¢ Account: 1`);
    console.log(`   ‚Ä¢ Leads: 2`);
    console.log(`   ‚Ä¢ Pipelines: 1 with 6 stages`);
    console.log(`   ‚Ä¢ Deals: 4 (1 won, 1 lost, 2 open)`);
    console.log(`   ‚Ä¢ Stage History: 3 entries`);
    console.log(`   ‚Ä¢ Audit Logs: 2`);
    
    console.log('\nÌ¥ê Test Credentials:');
    console.log('   ‚Ä¢ Admin: admin@acme.com / Admin123!');
    console.log('   ‚Ä¢ Manager: manager@acme.com / Manager123!');
    console.log('   ‚Ä¢ User: user@acme.com / User123!');
    console.log('   ‚Ä¢ Viewer: viewer@acme.com / Viewer123!');

  } catch (error) {
    console.error('‚ùå Error seeding database:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedDatabase();
}
