import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'test-org' },
    update: {},
    create: {
      name: 'Test Organization',
      slug: 'test-org',
      status: 'active',
    },
  });

  console.log(`✅ Organization created: ${organization.name}`);

  // Create test users
  const testUsers = [
    {
      email: 'user_a@test.com',
      firstName: 'User',
      lastName: 'A',
      password: 'TestPass123!',
      role: 'user',
    },
    {
      email: 'user_b@test.com',
      firstName: 'User',
      lastName: 'B',
      password: 'TestPass123!',
      role: 'user',
    },
    {
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      password: 'TestPass123!',
      role: 'admin',
    },
  ];

  for (const userData of testUsers) {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
      },
      create: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash,
        role: userData.role,
        organizationId: organization.id,
        isActive: true,
        emailVerified: true,
      },
    });

    console.log(`✅ User created: ${user.email} (${user.role})`);
  }

  console.log('🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });