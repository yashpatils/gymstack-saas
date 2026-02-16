ALTER TABLE "LocationInvite"
  ADD COLUMN "tokenPrefix" TEXT;

UPDATE "LocationInvite"
SET "tokenPrefix" = substring("tokenHash" from 1 for 6)
WHERE "tokenPrefix" IS NULL;

ALTER TABLE "LocationInvite"
  ALTER COLUMN "tokenPrefix" SET NOT NULL;

CREATE INDEX "LocationInvite_tenantId_locationId_status_idx"
  ON "LocationInvite"("tenantId", "locationId", "status");
