import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const perms = await prisma.permission.findMany({
    where: { 
      OR: [
        { code: { contains: 'contacts' } },
        { code: { contains: 'deals' } },
        { code: { contains: 'leads' } },
      ]
    },
    select: { code: true },
    take: 5
  });
  console.log('Other permissions format:', perms.map(p => p.code));
}

check().finally(() => prisma.$disconnect());
