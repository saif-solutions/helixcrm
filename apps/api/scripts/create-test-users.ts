import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function createTestUsers() {
  console.log("Creating test users for gate testing...");
  
  // Clean up any existing test users (optional)
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ["user_a@test.com", "user_b@test.com", "admin@test.com"]
      }
    }
  });
  
  await prisma.organization.deleteMany({
    where: {
      slug: {
        in: ["test-org-a", "test-org-b", "test-org-admin"]
      }
    }
  });

  // Create Organization A
  const orgA = await prisma.organization.create({
    data: {
      name: "Test Organization A",
      slug: "test-org-a",
    },
  });

  // Create Organization B
  const orgB = await prisma.organization.create({
    data: {
      name: "Test Organization B",
      slug: "test-org-b",
    },
  });

  // Create Organization Admin
  const orgAdmin = await prisma.organization.create({
    data: {
      name: "Test Organization Admin",
      slug: "test-org-admin",
    },
  });

  // Hash password
  const password = "TestPass123!";
  const passwordHash = await bcrypt.hash(password, 10);

  // Create User A (Organization A)
  const userA = await prisma.user.create({
    data: {
      email: "user_a@test.com",
      passwordHash,
      firstName: "User",
      lastName: "A",
      organizationId: orgA.id,
      isActive: true,
      tokenVersion: 1,
    },
  });

  // Create User B (Organization B)
  const userB = await prisma.user.create({
    data: {
      email: "user_b@test.com",
      passwordHash,
      firstName: "User",
      lastName: "B",
      organizationId: orgB.id,
      isActive: true,
      tokenVersion: 1,
    },
  });

  // Create Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@test.com",
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      organizationId: orgAdmin.id,
      isActive: true,
      tokenVersion: 1,
    },
  });

  // Create test contacts
  const contactA1 = await prisma.contact.create({
    data: {
      firstName: "Contact",
      lastName: "A1",
      email: "contact_a1@test.com",
      phone: "+1-555-0101",
      organizationId: orgA.id,
    },
  });

  const contactB1 = await prisma.contact.create({
    data: {
      firstName: "Contact",
      lastName: "B1",
      email: "contact_b1@test.com",
      phone: "+1-555-0202",
      organizationId: orgB.id,
    },
  });

  console.log("✅ Test users created successfully!");
  console.log("");
  console.log("=== TEST USER CREDENTIALS ===");
  console.log("Password for all users: TestPass123!");
  console.log("");
  console.log("User A (Organization A):");
  console.log("  Email: user_a@test.com");
  console.log("  Organization ID:", orgA.id);
  console.log("  Contact ID (A1):", contactA1.id);
  console.log("");
  console.log("User B (Organization B):");
  console.log("  Email: user_b@test.com");
  console.log("  Organization ID:", orgB.id);
  console.log("  Contact ID (B1):", contactB1.id);
  console.log("");
  console.log("Admin User:");
  console.log("  Email: admin@test.com");
  console.log("  Organization ID:", orgAdmin.id);
  console.log("");
  console.log("=== TESTING NOTES ===");
  console.log("1. Use these users for Gate 2 (Tenant Isolation) testing");
  console.log("2. User A should NOT access User B's contact");
  console.log("3. All users share same password for testing convenience");
  console.log("4. Token version starts at 1 for all users");

  await prisma.$disconnect();
}

createTestUsers().catch((e) => {
  console.error("Error creating test users:", e);
  process.exit(1);
});
