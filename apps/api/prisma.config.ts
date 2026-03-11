// prisma.config.ts
import { defineConfig } from '@prisma/config';

export default defineConfig({
  // Define your database connection URL
  datasource: {
    url: process.env.DATABASE_URL,
  },

  // Optional: Configure migrations path if needed
  migrations: {
    path: './prisma/migrations',
  },

  // Optional: Configure seed command
  // seed: {
  //   seed: 'tsx prisma/seed.ts',
  // },
});
