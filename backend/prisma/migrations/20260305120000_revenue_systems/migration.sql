ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "demoLastResetAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "referralCode" TEXT,
  ADD COLUMN IF NOT EXISTS "referredByTenantId" TEXT,
  ADD COLUMN IF NOT EXISTS "trialStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "upgradedAt" TIMESTAMP(3);

ALTER TABLE "Organization"
  ADD CONSTRAINT "Organization_referredByTenantId_fkey" FOREIGN KEY ("referredByTenantId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_referralCode_key" ON "Organization"("referralCode");
CREATE INDEX IF NOT EXISTS "Organization_referredByTenantId_idx" ON "Organization"("referredByTenantId");

CREATE TABLE IF NOT EXISTS "Lead" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "gymName" TEXT NOT NULL,
  "size" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");

CREATE TABLE IF NOT EXISTS "TrialEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrialEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TrialEvent_tenantId_createdAt_idx" ON "TrialEvent"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "TrialEvent_eventType_idx" ON "TrialEvent"("eventType");

ALTER TABLE "TrialEvent"
  ADD CONSTRAINT "TrialEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
