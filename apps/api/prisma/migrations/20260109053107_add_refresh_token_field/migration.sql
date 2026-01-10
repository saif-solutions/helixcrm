-- AlterTable
ALTER TABLE "users" ADD COLUMN     "refreshToken" TEXT;

-- CreateIndex
CREATE INDEX "users_refreshToken_idx" ON "users"("refreshToken");
