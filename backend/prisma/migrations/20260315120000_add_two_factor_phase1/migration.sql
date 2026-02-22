ALTER TABLE "User"
  ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "twoFactorMethod" TEXT,
  ADD COLUMN "twoFactorEnrolledAt" TIMESTAMP(3);

CREATE TABLE "two_factor_challenges" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "otpHash" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sendCount" INTEGER NOT NULL DEFAULT 0,
  "sendLockedUntil" TIMESTAMP(3),
  "verifyLockedUntil" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "requestedFromIp" VARCHAR(64),
  "requestedUserAgent" TEXT,
  CONSTRAINT "two_factor_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "two_factor_challenges_userId_createdAt_idx" ON "two_factor_challenges"("userId", "createdAt" DESC);
CREATE INDEX "two_factor_challenges_expiresAt_idx" ON "two_factor_challenges"("expiresAt");
CREATE INDEX "two_factor_challenges_consumedAt_expiresAt_idx" ON "two_factor_challenges"("consumedAt", "expiresAt");

ALTER TABLE "two_factor_challenges"
  ADD CONSTRAINT "two_factor_challenges_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
