import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('í¼± Starting database seed...');

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

  console.log(`âœ… Organization created: ${organization.name}`);

  // Create test users with secure passwords
  const testUsers = [
    {
      email: 'user@helixcrm.test',
      firstName: 'Regular',
      lastName: 'User',
      password: 'User123!', // Secure password
      role: 'user',
    },
    {
      email: 'admin@helixcrm.test',
      firstName: 'Admin',
      lastName: 'User',
      password: 'Admin123!', // Secure password
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
        tokenVersion: 1, // Ensure token version
        refreshToken: null, // Clear any existing refresh token
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
        tokenVersion: 1,
      },
    });

    console.log(`âœ… User created: ${user.email} (${user.role})`);
  }

  console.log('\ní¾‰ Database seed completed!');
  console.log('\n=== TEST CREDENTIALS ===');
  console.log('Admin:');
  console.log('  Email: admin@helixcrm.test');
  console.log('  Password: Admin123!');
  console.log('\nRegular User:');
  console.log('  Email: user@helixcrm.test');
  console.log('  Password: User123!');
  console.log('======================\n');
}

main()
  .catch((e) => {
    console.error('âŒ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
