-- AlterTable
ALTER TABLE "users" ADD COLUMN     "username" TEXT,
ADD COLUMN     "usernameChangesThisYear" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastUsernameChangeYear" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_username_key" ON "users"("tenantId", "username");
