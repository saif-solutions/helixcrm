/*
  Warnings:

  - You are about to drop the column `refreshToken` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "users_refreshToken_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "refreshToken",
ADD COLUMN     "refreshTokenHash" VARCHAR(255),
ADD COLUMN     "refreshTokenIssuedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_refreshTokenHash_idx" ON "users"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "users_refreshTokenIssuedAt_idx" ON "users"("refreshTokenIssuedAt");
