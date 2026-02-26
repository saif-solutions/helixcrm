import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function invalidateUserToken(email: string) {
  console.log(`Invalidating token for user: ${email}`);
  
  const user = await prisma.user.update({
    where: { email },
    data: {
      tokenVersion: {
        increment: 1,
      },
    },
  });
  
  console.log(`✅ Token invalidated. New tokenVersion: ${user.tokenVersion}`);
  console.log(`User ID: ${user.id}`);
  console.log(`Email: ${user.email}`);
  
  await prisma.$disconnect();
}

// Get email from command line argument or use default
const email = process.argv[2] || "user_a@test.com";
invalidateUserToken(email).catch(console.error);
