-- Add new membership scope columns if missing.
ALTER TABLE "Membership"
  ADD COLUMN IF NOT EXISTS "gymId" TEXT;

ALTER TABLE "Membership"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- Normalize legacy status values.
UPDATE "Membership"
SET "status" = 'ACTIVE'
WHERE "status" IS NULL OR "status" = '';

-- Ensure index/constraints for scoped memberships.
DROP INDEX IF EXISTS "Membership_orgId_userId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Membership_userId_orgId_gymId_role_key"
  ON "Membership" ("userId", "orgId", "gymId", "role");

CREATE INDEX IF NOT EXISTS "Membership_orgId_idx" ON "Membership" ("orgId");
CREATE INDEX IF NOT EXISTS "Membership_userId_idx" ON "Membership" ("userId");
CREATE INDEX IF NOT EXISTS "Membership_gymId_idx" ON "Membership" ("gymId");

-- Add optional FK for gym scope.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Membership_gymId_fkey'
  ) THEN
    ALTER TABLE "Membership"
      ADD CONSTRAINT "Membership_gymId_fkey"
      FOREIGN KEY ("gymId") REFERENCES "Gym"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
