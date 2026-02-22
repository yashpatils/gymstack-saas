-- AlterTable
ALTER TABLE "User" ADD COLUMN "name" TEXT;

-- CreateTable
CREATE TABLE "PendingEmailChange" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "newEmail" TEXT NOT NULL,
  "otpHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "requestCount" INTEGER NOT NULL DEFAULT 1,
  "resendAvailableAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  CONSTRAINT "PendingEmailChange_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PendingEmailChange"
  ADD CONSTRAINT "PendingEmailChange_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "PendingEmailChange_userId_consumedAt_expiresAt_idx"
  ON "PendingEmailChange"("userId", "consumedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "PendingEmailChange_newEmail_consumedAt_expiresAt_idx"
  ON "PendingEmailChange"("newEmail", "consumedAt", "expiresAt");
