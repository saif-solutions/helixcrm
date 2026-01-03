import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  console.log("Seeding database...");
  
  try {
    await prisma.$connect();
    
    // Create a test organization
    const organization = await prisma.organization.create({
      data: {
        name: "Test Organization",
        slug: "test-org",
        status: "active",
        settings: {},
      },
    });
    console.log("✓ Created organization:", organization.name);
    
    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: "admin@test.com",
        firstName: "Admin",
        lastName: "User",
        passwordHash: "hashed_password_placeholder",
        role: "admin",
        organizationId: organization.id,
      },
    });
    console.log("✓ Created user:", user.email);
    
    console.log("\n✅ Seed completed successfully!");
    
  } catch (error) {
    console.error("✗ Seed failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
