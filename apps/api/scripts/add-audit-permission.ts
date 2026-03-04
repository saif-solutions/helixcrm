import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addAuditPermission() {
  try {
    // Check if permission already exists - Using colon format
    const existingPermission = await prisma.permission.findUnique({
      where: { code: 'audit:read' }, // ✅ Fixed: Changed from 'audit.read' to 'audit:read'
    });

    if (!existingPermission) {
      await prisma.permission.create({
        data: {
          code: 'audit:read', // ✅ Fixed: Changed from 'audit.read' to 'audit:read'
          name: 'Read Audit Logs',
          description: 'Permission to view and export audit logs',
          module: 'audit',
        },
      });
      console.log('✅ Audit logs permission added: audit:read');
    } else {
      console.log('✅ Audit logs permission already exists: audit:read');
    }
  } catch (error: any) {
    console.error('❌ Error adding audit permission:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addAuditPermission();