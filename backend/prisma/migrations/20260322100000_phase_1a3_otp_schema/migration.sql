-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('EMAIL');

-- CreateEnum
CREATE TYPE "PendingChangeTargetType" AS ENUM ('TENANT_SETTINGS', 'USER_SETTINGS');

-- CreateEnum
CREATE TYPE "PendingChangeType" AS ENUM ('TENANT_SLUG', 'TENANT_NAME', 'PRIMARY_EMAIL', 'ENABLE_2SV_EMAIL', 'DISABLE_2SV_EMAIL');

-- CreateEnum
CREATE TYPE "LoginOtpChallengePurpose" AS ENUM ('LOGIN_2SV', 'ADMIN_LOGIN_2SV');

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "twoStepEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "twoStepEmailEnabledAt" TIMESTAMP(3),
  ADD COLUMN "lastTwoStepAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "pending_sensitive_changes" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT,
  "channel" "OtpChannel" NOT NULL DEFAULT 'EMAIL',
  "targetType" "PendingChangeTargetType" NOT NULL,
  "changeType" "PendingChangeType" NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "otpHash" VARCHAR(64) NOT NULL,
  "otpExpiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "resendCount" INTEGER NOT NULL DEFAULT 0,
  "resendAvailableAt" TIMESTAMP(3),
  "lastSentAt" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "requestedFromIp" VARCHAR(64),
  "requestedUserAgent" TEXT,

  CONSTRAINT "pending_sensitive_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_otp_challenges" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channel" "OtpChannel" NOT NULL DEFAULT 'EMAIL',
  "purpose" "LoginOtpChallengePurpose" NOT NULL DEFAULT 'LOGIN_2SV',
  "otpHash" VARCHAR(64) NOT NULL,
  "otpExpiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "resendCount" INTEGER NOT NULL DEFAULT 0,
  "resendAvailableAt" TIMESTAMP(3),
  "lastSentAt" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requestedFromIp" VARCHAR(64),
  "requestedUserAgent" TEXT,
  "tenantId" TEXT,
  "tenantSlug" TEXT,
  "adminOnly" BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "login_otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pending_sensitive_changes_userId_createdAt_idx" ON "pending_sensitive_changes"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "pending_sensitive_changes_tenantId_createdAt_idx" ON "pending_sensitive_changes"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "pending_sensitive_changes_userId_consumedAt_otpExpiresAt_idx" ON "pending_sensitive_changes"("userId", "consumedAt", "otpExpiresAt");

-- CreateIndex
CREATE INDEX "pending_sensitive_changes_changeType_createdAt_idx" ON "pending_sensitive_changes"("changeType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "pending_sensitive_changes_otpExpiresAt_idx" ON "pending_sensitive_changes"("otpExpiresAt");

-- CreateIndex
CREATE INDEX "login_otp_challenges_userId_createdAt_idx" ON "login_otp_challenges"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "login_otp_challenges_userId_consumedAt_otpExpiresAt_idx" ON "login_otp_challenges"("userId", "consumedAt", "otpExpiresAt");

-- CreateIndex
CREATE INDEX "login_otp_challenges_otpExpiresAt_idx" ON "login_otp_challenges"("otpExpiresAt");

-- CreateIndex
CREATE INDEX "login_otp_challenges_purpose_createdAt_idx" ON "login_otp_challenges"("purpose", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "pending_sensitive_changes" ADD CONSTRAINT "pending_sensitive_changes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_sensitive_changes" ADD CONSTRAINT "pending_sensitive_changes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_otp_challenges" ADD CONSTRAINT "login_otp_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_otp_challenges" ADD CONSTRAINT "login_otp_challenges_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
