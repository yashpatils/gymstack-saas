-- Add production-safe invite lifecycle fields and indices
ALTER TABLE "LocationInvite"
  ADD COLUMN IF NOT EXISTS "consumedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'LocationInvite_consumedByUserId_fkey'
  ) THEN
    ALTER TABLE "LocationInvite"
      ADD CONSTRAINT "LocationInvite_consumedByUserId_fkey"
      FOREIGN KEY ("consumedByUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "LocationInvite_tenantId_locationId_idx"
  ON "LocationInvite"("tenantId", "locationId");

CREATE INDEX IF NOT EXISTS "LocationInvite_role_consumedAt_idx"
  ON "LocationInvite"("role", "consumedAt");

CREATE INDEX IF NOT EXISTS "LocationInvite_tokenPrefix_idx"
  ON "LocationInvite"("tokenPrefix");
