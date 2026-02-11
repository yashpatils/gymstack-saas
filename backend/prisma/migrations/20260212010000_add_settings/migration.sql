-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- Seed feature-flag defaults
INSERT INTO "Setting" ("key", "value", "updatedAt")
VALUES
  ('enableBilling', 'false'::jsonb, CURRENT_TIMESTAMP),
  ('enableInvites', 'false'::jsonb, CURRENT_TIMESTAMP),
  ('enableAudit', 'true'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
