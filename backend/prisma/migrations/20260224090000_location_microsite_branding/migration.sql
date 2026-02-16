ALTER TABLE "Gym"
  ADD COLUMN "primaryColor" TEXT,
  ADD COLUMN "accentGradient" TEXT,
  ADD COLUMN "heroTitle" TEXT,
  ADD COLUMN "heroSubtitle" TEXT,
  ADD COLUMN "customDomain" TEXT,
  ADD COLUMN "domainVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "domainVerificationToken" TEXT;

CREATE UNIQUE INDEX "Gym_customDomain_key" ON "Gym"("customDomain");

ALTER TABLE "Organization"
  ADD COLUMN "whiteLabelEnabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Organization"
SET "whiteLabelEnabled" = "whiteLabelBrandingEnabled"
WHERE "whiteLabelBrandingEnabled" = true;
