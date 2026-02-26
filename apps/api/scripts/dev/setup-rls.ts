import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setupRLS() {
  console.log("Setting up Row-Level Security (RLS)...");

  const tables = [
    "organizations",
    "users",
    "contacts",
    "accounts",
    "activities",
    "audit_logs",
  ];

  for (const table of tables) {
    console.log(`Enabling RLS on ${table}...`);

    // Enable RLS
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;
    `);

    // Create policy that users can only see their organization's data
    if (table !== "organizations") {
      await prisma.$executeRawUnsafe(`
        CREATE POLICY "${table}_tenant_isolation_policy" 
        ON "${table}"
        FOR ALL
        USING (organization_id = current_setting('app.current_organization_id')::uuid);
      `);
    }

    // Organizations have special policy
    if (table === "organizations") {
      await prisma.$executeRawUnsafe(`
        CREATE POLICY "organizations_tenant_isolation_policy" 
        ON "organizations"
        FOR ALL
        USING (id = current_setting('app.current_organization_id')::uuid);
      `);
    }

    console.log(`✓ RLS enabled on ${table}`);
  }

  console.log("\n✅ RLS setup complete!");
  console.log("\nImportant:");
  console.log("1. Ensure app.current_organization_id is set in database session");
  console.log("2. Use the RLS middleware in your application");
}

setupRLS()
  .catch((e) => {
    console.error("Error setting up RLS:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
