-- CreateEnum
CREATE TYPE "ChangeIntentType" AS ENUM ('EMAIL_CHANGE', 'PASSWORD_CHANGE', 'ORG_SETTINGS_CHANGE', 'GYM_SETTINGS_CHANGE', 'SLUG_CHANGE', 'TWO_SV_TOGGLE', 'BILLING_EMAIL_CHANGE');

-- CreateEnum
CREATE TYPE "ChangeIntentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "billingEmail" TEXT;

-- CreateTable
CREATE TABLE "ChangeIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "gymId" TEXT,
    "type" "ChangeIntentType" NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "otpHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "ChangeIntentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChangeIntent_userId_status_expiresAt_idx" ON "ChangeIntent"("userId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "ChangeIntent_orgId_createdAt_idx" ON "ChangeIntent"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "ChangeIntent_gymId_createdAt_idx" ON "ChangeIntent"("gymId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChangeIntent" ADD CONSTRAINT "ChangeIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeIntent" ADD CONSTRAINT "ChangeIntent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeIntent" ADD CONSTRAINT "ChangeIntent_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;
