ALTER TABLE "LocationInvite" ALTER COLUMN "locationId" DROP NOT NULL;
ALTER TABLE "LocationInvite" DROP CONSTRAINT IF EXISTS "LocationInvite_locationId_fkey";
ALTER TABLE "LocationInvite"
  ADD CONSTRAINT "LocationInvite_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;
