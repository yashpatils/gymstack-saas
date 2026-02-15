ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "whiteLabelBrandingEnabled" BOOLEAN NOT NULL DEFAULT false;
