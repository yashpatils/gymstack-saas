-- AlterTable
ALTER TABLE "User"
ADD COLUMN "emailVerificationTokenHash" TEXT,
ADD COLUMN "emailVerificationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "emailVerificationLastSentAt" TIMESTAMP(3),
ADD COLUMN "emailVerificationSendCount" INTEGER NOT NULL DEFAULT 0;
