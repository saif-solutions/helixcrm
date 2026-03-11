import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

console.log('Prisma enums available?');
console.log(
  'ActorType:',
  Object.keys(prisma).filter((k) => k.includes('Actor')),
);
console.log(
  'Available from import:',
  Object.keys(require('@prisma/client')).filter(
    (k) => k.includes('Actor') || k.includes('Audit') || k.includes('Severity'),
  ),
);
