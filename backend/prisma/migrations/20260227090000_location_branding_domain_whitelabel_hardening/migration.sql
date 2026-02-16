ALTER TABLE "Gym"
  ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "primaryColor" TEXT,
  ADD COLUMN IF NOT EXISTS "accentGradient" TEXT,
  ADD COLUMN IF NOT EXISTS "heroTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "heroSubtitle" TEXT,
  ADD COLUMN IF NOT EXISTS "customDomain" TEXT,
  ADD COLUMN IF NOT EXISTS "domainVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "domainVerificationToken" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Gym_customDomain_key" ON "Gym"("customDomain");

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "whiteLabelEnabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Organization"
SET "whiteLabelEnabled" = "whiteLabelBrandingEnabled"
WHERE "whiteLabelBrandingEnabled" = true
  AND "whiteLabelEnabled" = false;
