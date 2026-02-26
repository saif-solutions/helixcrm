import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addAuditPermission() {
  try {
    // Check if permission already exists
    const existingPermission = await prisma.permission.findUnique({
      where: { code: 'audit.read' }, // Note: Using 'audit.read' not 'audit_logs:read'
    });

    if (!existingPermission) {
      await prisma.permission.create({
        data: {
          code: 'audit.read',
          name: 'Read Audit Logs',
          description: 'Permission to view and export audit logs',
          module: 'audit',
        },
      });
      console.log('✅ Audit logs permission added');
    } else {
      console.log('✅ Audit logs permission already exists');
    }
  } catch (error: any) { // Fixed error type
    console.error('❌ Error adding audit permission:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addAuditPermission();