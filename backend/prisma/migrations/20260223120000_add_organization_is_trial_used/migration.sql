-- Add missing trial usage flag to organizations.
ALTER TABLE "Organization"
ADD COLUMN "isTrialUsed" BOOLEAN NOT NULL DEFAULT false;
