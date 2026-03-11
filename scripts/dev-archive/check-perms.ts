import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const perms = await prisma.permission.findMany({
    where: { code: { contains: 'users' } },
    select: { code: true, name: true },
  });
  console.log('User permissions:', perms);
}

check().finally(() => prisma.$disconnect());
