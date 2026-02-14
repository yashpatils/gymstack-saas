ALTER TABLE "LocationInvite"
  ADD COLUMN "tokenHash" TEXT,
  ADD COLUMN "consumedAt" TIMESTAMP(3);

CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE "LocationInvite"
SET "tokenHash" = encode(digest("token", 'sha256'), 'hex')
WHERE "tokenHash" IS NULL;

ALTER TABLE "LocationInvite"
  ALTER COLUMN "tokenHash" SET NOT NULL;

CREATE UNIQUE INDEX "LocationInvite_tokenHash_key" ON "LocationInvite"("tokenHash");
CREATE INDEX "LocationInvite_createdByUserId_idx" ON "LocationInvite"("createdByUserId");

ALTER TABLE "LocationInvite" DROP COLUMN "token";
