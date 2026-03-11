// D:\Projects-In-Hand\helixcrm\apps\api\prisma\seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clear existing data in correct order (skipping append-only tables)
  console.log('Clearing existing data...');

  try {
    // First, try to delete in reverse dependency order
    await prisma.$transaction([
      prisma.evidenceChain.deleteMany(),
      prisma.evidenceCollection.deleteMany(),
      // Skip append-only tables - they can't be deleted
      // prisma.auditIntegrityVerification.deleteMany(),
      // prisma.appendOnlyAuditChain.deleteMany(),
      prisma.controlVerification.deleteMany(),
      prisma.gapAnalysis.deleteMany(),
      prisma.webhookDelivery.deleteMany(),
      prisma.webhook.deleteMany(),
      prisma.exportJob.deleteMany(),
      prisma.importJob.deleteMany(),
      prisma.sentEmail.deleteMany(),
      prisma.emailTemplate.deleteMany(),
      prisma.file.deleteMany(),
      prisma.dealStageHistory.deleteMany(),
      prisma.deal.deleteMany(),
      prisma.pipelineStage.deleteMany(),
      prisma.pipeline.deleteMany(),
      prisma.activityDailySummary.deleteMany(),
      prisma.pipelineStageSummary.deleteMany(),
      prisma.dealSummaryDaily.deleteMany(),
      prisma.dealStageSummaryDaily.deleteMany(),
      prisma.dealForecastSummaryDaily.deleteMany(),
      prisma.revenueSummaryDaily.deleteMany(),
      prisma.revenueDailySummary.deleteMany(),
      prisma.rolePermission.deleteMany(),
      prisma.userRole.deleteMany(),
      prisma.role.deleteMany(),
      prisma.permission.deleteMany(),
      prisma.activity.deleteMany(),
      prisma.passwordResetToken.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.lead.deleteMany(),
      prisma.contact.deleteMany(),
      prisma.account.deleteMany(),
      prisma.user.deleteMany(),
      prisma.organization.deleteMany(),
    ]);

    console.log('Successfully cleared existing data');
  } catch (error) {
    console.log('Note: Some tables could not be cleared (append-only tables)');
    // Continue with seeding even if deletion fails for some tables
  }

  console.log('Creating organizations...');
  const organizations = [];
  for (let i = 1; i <= 10; i++) {
    const org = await prisma.organization.create({
      data: {
        id: `org_${String(i).padStart(3, '0')}`,
        name: `Organization ${i}`,
        slug: `org-${i}`,
        status: 'active',
        settings: {
          timezone: 'America/New_York',
          industry: [
            'Technology',
            'Finance',
            'Healthcare',
            'Manufacturing',
            'Retail',
          ][i % 5],
        },
      },
    });
    organizations.push(org);
  }

  console.log('Creating permissions...');
  const permissionsData = [
    { code: 'user:read', name: 'Read Users', module: 'User' },
    { code: 'user:write', name: 'Write Users', module: 'User' },
    { code: 'user:delete', name: 'Delete Users', module: 'User' },
    { code: 'deal:read', name: 'Read Deals', module: 'Deal' },
    { code: 'deal:write', name: 'Write Deals', module: 'Deal' },
    { code: 'deal:delete', name: 'Delete Deals', module: 'Deal' },
    { code: 'contact:read', name: 'Read Contacts', module: 'Contact' },
    { code: 'contact:write', name: 'Write Contacts', module: 'Contact' },
    { code: 'contact:delete', name: 'Delete Contacts', module: 'Contact' },
    { code: 'pipeline:read', name: 'Read Pipelines', module: 'Pipeline' },
    { code: 'pipeline:write', name: 'Write Pipelines', module: 'Pipeline' },
    { code: 'report:read', name: 'Read Reports', module: 'Report' },
    { code: 'admin:access', name: 'Admin Access', module: 'Admin' },
    { code: 'settings:manage', name: 'Manage Settings', module: 'Settings' },
  ];

  const permissions = [];
  for (const perm of permissionsData) {
    const created = await prisma.permission.create({
      data: {
        id: `perm_${perm.code.replace(/:/g, '_')}`,
        ...perm,
        description: `Can ${perm.name.toLowerCase()}`,
      },
    });
    permissions.push(created);
  }

  console.log('Creating roles for each organization...');
  const roles = [];
  for (const org of organizations) {
    // Admin Role
    const adminRole = await prisma.role.create({
      data: {
        id: `role_${org.id}_admin`,
        name: 'Admin',
        description: 'Full system access',
        isSystem: true,
        organizationId: org.id,
      },
    });
    roles.push(adminRole);

    // Manager Role
    const managerRole = await prisma.role.create({
      data: {
        id: `role_${org.id}_manager`,
        name: 'Manager',
        description: 'Can manage deals and contacts',
        isSystem: true,
        organizationId: org.id,
      },
    });
    roles.push(managerRole);

    // Sales Rep Role
    const repRole = await prisma.role.create({
      data: {
        id: `role_${org.id}_rep`,
        name: 'Sales Representative',
        description: 'Can view and update assigned deals',
        isSystem: true,
        organizationId: org.id,
      },
    });
    roles.push(repRole);
  }

  console.log('Creating role permissions...');
  for (const role of roles) {
    // Explicitly type the variable
    let permsToAssign: typeof permissions = [];

    if (role.name === 'Admin') {
      permsToAssign = permissions;
    } else if (role.name === 'Manager') {
      permsToAssign = permissions.filter((p) =>
        [
          'deal:read',
          'deal:write',
          'contact:read',
          'contact:write',
          'pipeline:read',
          'report:read',
        ].includes(p.code),
      );
    } else if (role.name === 'Sales Representative') {
      permsToAssign = permissions.filter((p) =>
        ['deal:read', 'deal:write', 'contact:read', 'contact:write'].includes(
          p.code,
        ),
      );
    }

    for (const perm of permsToAssign) {
      await prisma.rolePermission.create({
        data: {
          id: `rp_${role.id}_${perm.id}`,
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }
  }

  console.log('Creating users for each organization...');
  const users = [];
  for (const org of organizations) {
    for (let j = 1; j <= 10; j++) {
      const user = await prisma.user.create({
        data: {
          id: `user_${org.id}_${j}`,
          email: `user${j}@${org.slug}.com`,
          firstName: `FirstName${j}`,
          lastName: `LastName${j}`,
          passwordHash: `$2a$10$${Math.random().toString(36).substring(2, 15)}`,
          role: j === 1 ? 'admin' : j === 2 ? 'manager' : 'user',
          organizationId: org.id,
          emailVerified: true,
          lastLoginAt: new Date(
            Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
          ),
          tokenVersion: 1,
          failedLoginAttempts: 0,
          mustChangePassword: false,
        },
      });
      users.push(user);
    }
  }

  console.log('Creating user roles...');
  for (const user of users) {
    const orgRoles = roles.filter(
      (r) => r.organizationId === user.organizationId,
    );
    let roleToAssign;
    if (user.role === 'admin') {
      roleToAssign = orgRoles.find((r) => r.name === 'Admin');
    } else if (user.role === 'manager') {
      roleToAssign = orgRoles.find((r) => r.name === 'Manager');
    } else {
      roleToAssign = orgRoles.find((r) => r.name === 'Sales Representative');
    }

    if (roleToAssign) {
      await prisma.userRole.create({
        data: {
          id: `ur_${user.id}_${roleToAssign.id}`,
          userId: user.id,
          roleId: roleToAssign.id,
          organizationId: user.organizationId,
        },
      });
    }
  }

  console.log('Creating refresh tokens...');
  for (const user of users) {
    for (let t = 1; t <= 2; t++) {
      await prisma.refreshToken.create({
        data: {
          id: `rt_${user.id}_${t}`,
          userId: user.id,
          organizationId: user.organizationId,
          tokenHash: `hash_${Math.random().toString(36).substring(2, 15)}`,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          revoked: t === 2 && Math.random() > 0.7,
          ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
    }
  }

  console.log('Creating accounts for each organization...');
  const accounts = [];
  for (const org of organizations) {
    for (let j = 1; j <= 10; j++) {
      const account = await prisma.account.create({
        data: {
          id: `acc_${org.id}_${j}`,
          name: `Account ${j} for ${org.name}`,
          industry: [
            'Technology',
            'Finance',
            'Healthcare',
            'Manufacturing',
            'Retail',
          ][j % 5],
          website: `https://account${j}.com`,
          phone: `+1-555-${String(j).padStart(4, '0')}`,
          email: `info@account${j}.com`,
          address: `${j} Main St, City, State 12345`,
          organizationId: org.id,
          metadata: { founded: 2000 + j, employees: j * 100 },
        },
      });
      accounts.push(account);
    }
  }

  console.log('Creating contacts...');
  const contacts = [];
  for (const org of organizations) {
    const orgAccounts = accounts.filter((a) => a.organizationId === org.id);

    for (let j = 1; j <= 15; j++) {
      const contact = await prisma.contact.create({
        data: {
          id: `con_${org.id}_${j}`,
          firstName: `Contact${j}`,
          lastName: `LastName${j}`,
          email: `contact${j}@example.com`,
          phone: `+1-555-${String(j).padStart(4, '0')}`,
          title: ['CEO', 'CTO', 'VP Sales', 'Director', 'Manager'][j % 5],
          department: ['Executive', 'Sales', 'Engineering', 'Marketing'][j % 4],
          company: `Company ${j}`,
          organizationId: org.id,
          accountId:
            j % 2 === 0 ? orgAccounts[j % orgAccounts.length]?.id : null,
          metadata: { source: 'website', preferred_contact: 'email' },
        },
      });
      contacts.push(contact);
    }
  }

  console.log('Creating leads...');
  for (const org of organizations) {
    for (let j = 1; j <= 10; j++) {
      await prisma.lead.create({
        data: {
          id: `lead_${org.id}_${j}`,
          name: `Lead ${j}`,
          email: `lead${j}@example.com`,
          phone: `+1-555-${String(j).padStart(4, '0')}`,
          status: ['new', 'contacted', 'qualified'][j % 3] as any,
          organizationId: org.id,
          metadata: { source: 'website', campaign: 'summer_promo' },
        },
      });
    }
  }

  console.log('Creating pipelines...');
  const pipelines = [];
  for (const org of organizations) {
    for (let j = 1; j <= 2; j++) {
      const pipeline = await prisma.pipeline.create({
        data: {
          id: `pipe_${org.id}_${j}`,
          name: j === 1 ? 'Sales Pipeline' : 'Custom Pipeline',
          description:
            j === 1 ? 'Standard sales process' : 'Custom sales process',
          isDefault: j === 1,
          organizationId: org.id,
        },
      });
      pipelines.push(pipeline);

      // Create stages for each pipeline
      const stages = [
        'Lead',
        'Qualified',
        'Proposal',
        'Negotiation',
        'Closed Won',
      ];
      for (let k = 0; k < stages.length; k++) {
        await prisma.pipelineStage.create({
          data: {
            id: `stage_${pipeline.id}_${k + 1}`,
            name: stages[k],
            description: `${stages[k]} stage`,
            order: k + 1,
            probability: (k + 1) * 20,
            pipelineId: pipeline.id,
          },
        });
      }
    }
  }

  console.log('Creating deals...');
  const deals = [];
  for (const org of organizations) {
    const orgUsers = users.filter((u) => u.organizationId === org.id);
    const orgPipelines = pipelines.filter((p) => p.organizationId === org.id);
    const orgContacts = contacts.filter((c) => c.organizationId === org.id);
    const orgAccounts = accounts.filter((a) => a.organizationId === org.id);

    for (let j = 1; j <= 20; j++) {
      const pipeline = orgPipelines[j % orgPipelines.length];
      const stages = await prisma.pipelineStage.findMany({
        where: { pipelineId: pipeline.id },
      });
      const stage = stages[j % stages.length];

      const deal = await prisma.deal.create({
        data: {
          id: `deal_${org.id}_${j}`,
          name: `Deal ${j} for ${org.name}`,
          amount: Math.floor(Math.random() * 100000 + 10000),
          currency: ['USD', 'EUR', 'GBP'][j % 3],
          status: ['open', 'won', 'lost'][j % 3] as any,
          probability: Math.floor(Math.random() * 100),
          expectedCloseDate: new Date(
            Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000,
          ),
          pipelineId: pipeline.id,
          stageId: stage.id,
          contactId: orgContacts[j % orgContacts.length]?.id,
          accountId: orgAccounts[j % orgAccounts.length]?.id,
          ownerUserId: orgUsers[j % orgUsers.length].id,
          organizationId: org.id,
          metadata: { priority: 'high', notes: 'Important client' },
        },
      });
      deals.push(deal);
    }
  }

  console.log('Creating deal stage history...');
  for (const deal of deals) {
    const stages = await prisma.pipelineStage.findMany({
      where: { pipelineId: deal.pipelineId },
    });

    for (let h = 1; h <= 3; h++) {
      if (stages.length > h) {
        await prisma.dealStageHistory.create({
          data: {
            id: `hist_${deal.id}_${h}`,
            dealId: deal.id,
            fromStageId: h === 1 ? null : stages[h - 2].id,
            toStageId: stages[h - 1].id,
            changedByUserId: deal.ownerUserId,
            changedAt: new Date(Date.now() - (3 - h) * 7 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }
  }

  console.log('Creating activities...');
  for (const org of organizations) {
    const orgUsers = users.filter((u) => u.organizationId === org.id);
    const orgContacts = contacts.filter((c) => c.organizationId === org.id);
    const orgDeals = deals.filter((d) => d.organizationId === org.id);

    for (let j = 1; j <= 30; j++) {
      const relatedTo =
        j % 2 === 0
          ? orgContacts[j % orgContacts.length]
          : orgDeals[j % orgDeals.length];

      await prisma.activity.create({
        data: {
          id: `act_${org.id}_${j}`,
          type: ['call', 'email', 'meeting', 'task'][j % 4],
          title: `Activity ${j}`,
          description: `Description for activity ${j}`,
          status: ['pending', 'completed', 'cancelled'][j % 3],
          organizationId: org.id,
          userId: orgUsers[j % orgUsers.length].id,
          relatedToId: relatedTo?.id,
          relatedToType: j % 2 === 0 ? 'contact' : 'deal',
          scheduledAt: new Date(
            Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000,
          ),
          completedAt:
            Math.random() > 0.3
              ? new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000)
              : null,
        },
      });
    }
  }

  console.log('Creating email templates...');
  for (const org of organizations) {
    for (let j = 1; j <= 5; j++) {
      await prisma.emailTemplate.create({
        data: {
          id: `et_${org.id}_${j}`,
          name: `Template ${j}`,
          subject: `Subject for template ${j}`,
          body: `<h1>Welcome!</h1><p>This is template ${j}</p>`,
          bodyText: `Plain text version of template ${j}`,
          category: ['Welcome', 'Follow-up', 'Newsletter', 'Promotional'][
            j % 4
          ],
          variables: ['{{name}}', '{{email}}', '{{company}}'],
          isActive: true,
          organizationId: org.id,
        },
      });
    }
  }

  console.log('Creating sent emails...');
  for (const org of organizations) {
    const orgUsers = users.filter((u) => u.organizationId === org.id);
    const orgContacts = contacts.filter((c) => c.organizationId === org.id);
    const orgTemplates = await prisma.emailTemplate.findMany({
      where: { organizationId: org.id },
    });

    for (let j = 1; j <= 20; j++) {
      await prisma.sentEmail.create({
        data: {
          id: `se_${org.id}_${j}`,
          templateId: orgTemplates[j % orgTemplates.length]?.id,
          to: `recipient${j}@example.com`,
          toName: `Recipient ${j}`,
          cc: ['cc1@example.com', 'cc2@example.com'],
          bcc: ['bcc@example.com'],
          subject: `Email subject ${j}`,
          body: `<p>Email body content ${j}</p>`,
          bodyText: `Plain text version`,
          status: ['sent', 'delivered', 'opened', 'clicked', 'failed'][j % 5],
          errorMessage: j % 5 === 4 ? 'Delivery failed' : null,
          organizationId: org.id,
          userId: orgUsers[j % orgUsers.length]?.id,
          contactId: orgContacts[j % orgContacts.length]?.id,
          sentAt: new Date(
            Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000,
          ),
          openedAt:
            Math.random() > 0.4
              ? new Date(Date.now() - Math.random() * 9 * 24 * 60 * 60 * 1000)
              : null,
          clickedAt:
            Math.random() > 0.7
              ? new Date(Date.now() - Math.random() * 8 * 24 * 60 * 60 * 1000)
              : null,
        },
      });
    }
  }

  console.log('Creating files...');
  for (const org of organizations) {
    const orgUsers = users.filter((u) => u.organizationId === org.id);

    for (let j = 1; j <= 15; j++) {
      await prisma.file.create({
        data: {
          id: `file_${org.id}_${j}`,
          filename: `file_${j}.pdf`,
          originalName: `Document ${j}.pdf`,
          mimeType: [
            'application/pdf',
            'image/jpeg',
            'application/vnd.ms-excel',
          ][j % 3],
          size: Math.floor(Math.random() * 5000000 + 10000),
          path: `/uploads/${org.id}/file_${j}.pdf`,
          metadata: { description: 'Uploaded document' },
          organizationId: org.id,
          userId: orgUsers[j % orgUsers.length]?.id,
        },
      });
    }
  }

  console.log('Creating export jobs...');
  for (const org of organizations) {
    const orgUsers = users.filter((u) => u.organizationId === org.id);

    for (let j = 1; j <= 10; j++) {
      await prisma.exportJob.create({
        data: {
          id: `ej_${org.id}_${j}`,
          type: ['deals', 'contacts', 'accounts', 'leads'][j % 4],
          format: ['csv', 'xlsx', 'pdf'][j % 3],
          status: ['pending', 'processing', 'completed', 'failed'][j % 4],
          fileName: `export_${j}.${['csv', 'xlsx', 'pdf'][j % 3]}`,
          filePath: `/exports/org_${org.id}/export_${j}`,
          fileSize: Math.floor(Math.random() * 1000000),
          totalRecords: Math.floor(Math.random() * 1000 + 50),
          processedRecords: Math.floor(Math.random() * 800 + 40),
          errorMessage: j % 4 === 3 ? 'Export failed' : null,
          organizationId: org.id,
          userId: orgUsers[j % orgUsers.length]?.id,
          createdAt: new Date(
            Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000,
          ),
          startedAt: new Date(
            Date.now() - Math.random() * 19 * 24 * 60 * 60 * 1000,
          ),
          completedAt:
            Math.random() > 0.2
              ? new Date(Date.now() - Math.random() * 18 * 24 * 60 * 60 * 1000)
              : null,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  console.log('Creating import jobs...');
  for (const org of organizations) {
    const orgUsers = users.filter((u) => u.organizationId === org.id);

    for (let j = 1; j <= 8; j++) {
      await prisma.importJob.create({
        data: {
          id: `ij_${org.id}_${j}`,
          type: ['contacts', 'deals', 'leads', 'accounts'][j % 4],
          source: ['csv', 'excel', 'api'][j % 3],
          fileName: `import_${j}.csv`,
          fileSize: Math.floor(Math.random() * 500000 + 1000),
          status: ['pending', 'processing', 'completed', 'failed'][j % 4],
          totalRecords: Math.floor(Math.random() * 1000 + 50),
          processedRecords: Math.floor(Math.random() * 900 + 40),
          failedRecords: Math.floor(Math.random() * 50),
          errorMessage:
            j % 4 === 3 ? 'Import failed due to invalid data' : null,
          metadata: {
            source_system: 'external',
            mapping: { name: 'full_name' },
          },
          organizationId: org.id,
          userId: orgUsers[j % orgUsers.length]?.id,
          createdAt: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
          ),
          startedAt: new Date(
            Date.now() - Math.random() * 29 * 24 * 60 * 60 * 1000,
          ),
          completedAt:
            Math.random() > 0.2
              ? new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000)
              : null,
        },
      });
    }
  }

  console.log('Creating webhooks...');
  for (const org of organizations) {
    for (let j = 1; j <= 5; j++) {
      await prisma.webhook.create({
        data: {
          id: `wh_${org.id}_${j}`,
          name: `Webhook ${j}`,
          url: `https://api.example${j}.com/webhook`,
          events: ['deal.created', 'deal.updated', 'contact.created'],
          secret: `whsec_${Math.random().toString(36).substring(2, 15)}`,
          isActive: true,
          organizationId: org.id,
          retryCount: 3,
          timeoutMs: 10000,
          headers: { 'X-Custom-Header': 'value' },
        },
      });
    }
  }

  console.log('Creating webhook deliveries...');
  for (const org of organizations) {
    const orgWebhooks = await prisma.webhook.findMany({
      where: { organizationId: org.id },
    });

    for (let j = 1; j <= 20; j++) {
      await prisma.webhookDelivery.create({
        data: {
          id: `wd_${org.id}_${j}`,
          webhookId: orgWebhooks[j % orgWebhooks.length]?.id,
          event: ['deal.created', 'deal.updated', 'contact.created'][j % 3],
          payload: { event: 'test', id: j },
          status: ['success', 'failed', 'pending', 'retrying'][j % 4],
          statusCode: Math.random() > 0.3 ? 200 : 500,
          response: Math.random() > 0.3 ? '{"message": "OK"}' : null,
          errorMessage: Math.random() < 0.3 ? 'Connection timeout' : null,
          organizationId: org.id,
          attempts: Math.floor(Math.random() * 3 + 1),
          retryCount: Math.floor(Math.random() * 2),
          attemptedAt: new Date(
            Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000,
          ),
          completedAt:
            Math.random() > 0.3
              ? new Date(Date.now() - Math.random() * 9 * 24 * 60 * 60 * 1000)
              : null,
          nextAttemptAt:
            Math.random() < 0.2
              ? new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000)
              : null,
        },
      });
    }
  }

  console.log('Creating audit logs...');
  const actions = [
    'LOGIN_SUCCESS',
    'LOGIN_FAILURE',
    'LOGOUT',
    'USER_CREATED',
    'USER_UPDATED',
    'CONTACT_CREATED',
    'CONTACT_UPDATED',
    'DEAL_CREATED',
    'DEAL_UPDATED',
    'PERMISSION_DENIED',
  ];
  const entityTypes = ['USER', 'CONTACT', 'DEAL', 'AUTH', 'SYSTEM'];

  for (const org of organizations) {
    const orgUsers = users.filter((u) => u.organizationId === org.id);

    for (let j = 1; j <= 50; j++) {
      await prisma.auditLog.create({
        data: {
          id: `al_${org.id}_${j}`,
          action: actions[j % actions.length] as any,
          entityType: entityTypes[j % entityTypes.length] as any,
          entityId: `entity_${j}`,
          organizationId: org.id,
          actorUserId:
            Math.random() > 0.1 ? orgUsers[j % orgUsers.length]?.id : null,
          actorEmail: `user${j % 10}@example.com`,
          actorType: Math.random() > 0.2 ? 'USER' : 'SYSTEM',
          requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
          severity: ['LOW', 'MEDIUM', 'HIGH'][j % 3] as any,
          metadata: { details: 'Sample audit log entry' },
          ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0...',
          correlationId: `corr_${Math.random().toString(36).substring(2, 10)}`,
        },
      });
    }
  }

  // Handle append-only tables (we'll just add data, not delete)
  console.log('Creating append-only audit chain entries...');

  // First, check the current max block_index
  const maxBlock = await prisma.appendOnlyAuditChain.aggregate({
    _max: {
      blockIndex: true,
    },
  });

  const startBlock = (maxBlock._max.blockIndex || 0) + 1;

  for (let i = 0; i < 20; i++) {
    const blockIndex = startBlock + i;
    await prisma.appendOnlyAuditChain
      .create({
        data: {
          id: `aoc_${blockIndex}`,
          eventHash: `hash_${Math.random().toString(36).substring(2, 15)}`,
          previousHash:
            blockIndex === 1
              ? '0'.repeat(64)
              : `hash_${Math.random().toString(36).substring(2, 15)}`,
          blockIndex: blockIndex,
          metadata: { event: `Event ${blockIndex}`, timestamp: new Date() },
        },
      })
      .catch((e) => {
        // If unique constraint fails, try with a different hash
        if (e.code === 'P2002') {
          return prisma.appendOnlyAuditChain.create({
            data: {
              id: `aoc_${blockIndex}_${Date.now()}`,
              eventHash: `hash_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`,
              previousHash:
                blockIndex === 1
                  ? '0'.repeat(64)
                  : `hash_${Math.random().toString(36).substring(2, 15)}`,
              blockIndex: blockIndex,
              metadata: { event: `Event ${blockIndex}`, timestamp: new Date() },
            },
          });
        }
        throw e;
      });
  }

  console.log('Creating evidence collections...');
  for (let i = 1; i <= 15; i++) {
    await prisma.evidenceCollection.create({
      data: {
        id: `ec_${i}`,
        collectionId: `collection_${i}`,
        collectedAt: new Date(
          Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000,
        ),
        totalControls: Math.floor(Math.random() * 50 + 10),
        criteriaBreakdown: { completed: 30, pending: 15, failed: 5 },
        evidencePath: `/evidence/collection_${i}`,
        verificationHash: `hash_${Math.random().toString(36).substring(2, 15)}`,
        status: ['completed', 'in_progress', 'failed'][i % 3],
      },
    });
  }

  console.log('Creating evidence chains...');
  for (let i = 1; i <= 25; i++) {
    await prisma.evidenceChain.create({
      data: {
        id: `ech_${i}`,
        evidenceHash: `ev_hash_${Math.random().toString(36).substring(2, 15)}`,
        previousHash:
          i === 1
            ? '0'.repeat(64)
            : `ev_hash_${Math.random().toString(36).substring(2, 15)}`,
        collectionId: `collection_${Math.floor(i / 2) + 1}`,
        evidenceData: { file: `evidence_${i}.pdf`, size: 1024, hash: 'abc123' },
      },
    });
  }

  console.log('Creating control verifications...');
  for (let i = 1; i <= 20; i++) {
    await prisma.controlVerification.create({
      data: {
        id: `cv_${i}`,
        controlId: `control_${i}`,
        controlName: `Control ${i}`,
        criteria: `Criteria for control ${i}`,
        verificationDate: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        ),
        status: ['compliant', 'non_compliant', 'partial'][i % 3],
        evidenceCount: Math.floor(Math.random() * 10 + 1),
        verifiedBy: `auditor_${i % 5}`,
        notes: `Verification notes for control ${i}`,
      },
    });
  }

  console.log('Creating gap analyses...');
  for (let i = 1; i <= 8; i++) {
    await prisma.gapAnalysis.create({
      data: {
        id: `ga_${i}`,
        analysisDate: new Date(
          Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000,
        ),
        totalControls: Math.floor(Math.random() * 100 + 50),
        completedControls: Math.floor(Math.random() * 60 + 20),
        partialControls: Math.floor(Math.random() * 30),
        missingControls: Math.floor(Math.random() * 20),
        overallRisk: ['low', 'medium', 'high'][i % 3],
        reportPath: `/reports/gap_analysis_${i}.pdf`,
      },
    });
  }

  console.log('Creating daily summaries...');

  // Revenue Daily Summaries
  for (const org of organizations) {
    for (let d = 0; d < 30; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d);

      await prisma.revenueDailySummary.create({
        data: {
          id: `rds_${org.id}_${d}`,
          organizationId: org.id,
          date: date,
          totalRevenue: Math.floor(Math.random() * 100000 + 50000),
          wonRevenue: Math.floor(Math.random() * 50000 + 10000),
          forecastRevenue: Math.floor(Math.random() * 150000 + 50000),
          totalDeals: Math.floor(Math.random() * 50 + 10),
          wonDeals: Math.floor(Math.random() * 20 + 5),
          averageDealSize: Math.floor(Math.random() * 5000 + 1000),
          currency: 'USD',
          summarizedAt: new Date(),
        },
      });
    }
  }

  // Deal Summary Daily
  for (const org of organizations) {
    for (let d = 0; d < 30; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d);

      await prisma.dealSummaryDaily.create({
        data: {
          id: `dsd_${org.id}_${d}`,
          organizationId: org.id,
          date: date,
          dealCount: Math.floor(Math.random() * 100 + 20),
          newDeals: Math.floor(Math.random() * 30 + 5),
          wonDeals: Math.floor(Math.random() * 20 + 2),
          lostDeals: Math.floor(Math.random() * 15 + 1),
          activeDeals: Math.floor(Math.random() * 60 + 10),
          totalValue: Math.floor(Math.random() * 500000 + 100000),
          averageValue: Math.floor(Math.random() * 10000 + 2000),
          summarizedAt: new Date(),
        },
      });
    }
  }

  // Activity Daily Summary
  for (const org of organizations) {
    for (let d = 0; d < 30; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d);

      await prisma.activityDailySummary.create({
        data: {
          id: `ads_${org.id}_${d}`,
          organizationId: org.id,
          date: date,
          loginCount: Math.floor(Math.random() * 50 + 10),
          dealCreated: Math.floor(Math.random() * 20 + 1),
          dealUpdated: Math.floor(Math.random() * 40 + 5),
          dealWon: Math.floor(Math.random() * 10 + 1),
          dealLost: Math.floor(Math.random() * 8 + 1),
          contactCreated: Math.floor(Math.random() * 15 + 2),
          contactUpdated: Math.floor(Math.random() * 25 + 3),
          leadCreated: Math.floor(Math.random() * 12 + 1),
          leadConverted: Math.floor(Math.random() * 8 + 1),
          activeUsers: Math.floor(Math.random() * 30 + 5),
          totalActions: Math.floor(Math.random() * 200 + 50),
          summarizedAt: new Date(),
        },
      });
    }
  }

  console.log('Seed completed successfully!');

  // Print summary
  console.log('\n=== SEED SUMMARY ===');
  console.log(`Organizations: ${organizations.length}`);
  console.log(`Users: ${users.length}`);
  console.log(`Accounts: ${accounts.length}`);
  console.log(`Contacts: ${contacts.length}`);
  console.log(`Deals: ${deals.length}`);
  console.log('====================\n');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
